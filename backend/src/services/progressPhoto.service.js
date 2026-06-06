"use strict";

const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const { ProgressPhoto, PHOTO_STATUSES } = require("../schemas/ProgressPhoto.schema");
const { Client } = require("../schemas/Client.schema");
const ApiError = require("../utils/ApiError");
const { UPLOAD_ROOT } = require("../middleware/upload");
const activityService = require("./activity.service");

async function assertClientAccess(clientId, user) {
  if (!mongoose.isValidObjectId(clientId)) throw new ApiError(400, "Invalid clientId");
  const client = await Client.findById(clientId);
  if (!client) throw new ApiError(404, "Client not found");
  if (user.role === "ADMIN") return client;
  if (user.role === "TRAINER" && String(client.trainerId) === String(user._id)) return client;
  if (user.role === "CLIENT"  && String(client.userId)    === String(user._id)) return client;
  throw new ApiError(403, "Forbidden");
}

async function resolveCurrentClient(user) {
  if (user.role !== "CLIENT") throw new ApiError(403, "Forbidden");
  const client = await Client.findOne({ userId: user._id });
  if (!client) throw new ApiError(404, "Client record not found");
  return client;
}

function fileToPath(file) {
  return file ? `/uploads/${file.filename}` : undefined;
}

/**
 * POST /api/progress-photos
 * Upsert semantic — one photo set per (clientId, weekNumber). If a set
 * already exists for this week, the provided slots replace the existing
 * ones (slots not provided are left intact). Disk cleanup for replaced
 * files is best-effort.
 *
 * - TRAINER / ADMIN: must pass `clientId` in body.
 * - CLIENT:          `clientId` resolved from auth (their own Client doc).
 */
async function create(user, body, files = {}) {
  // Resolve the client. Client role uploads for self; trainer/admin pass
  // an explicit clientId.
  let client;
  if (user.role === "CLIENT") {
    client = await resolveCurrentClient(user);
  } else {
    client = await assertClientAccess(body.clientId, user);
  }

  const weekNumber = Number(body.weekNumber);
  if (!weekNumber || weekNumber < 1) throw new ApiError(400, "weekNumber is required");

  const front = files.front?.[0];
  const side  = files.side?.[0];
  const back  = files.back?.[0];
  if (!front && !side && !back) throw new ApiError(400, "At least one photo is required");

  const existing = await ProgressPhoto.findOne({ clientId: client._id, weekNumber });

  // Track which on-disk files get replaced so we can unlink them after
  // the DB write succeeds.
  const replaced = [];
  const setSlot = (doc, slot, file) => {
    if (!file) return;
    if (doc[`${slot}Photo`]) replaced.push(doc[`${slot}Photo`]);
    doc[`${slot}Photo`] = fileToPath(file);
  };

  let doc;
  if (existing) {
    setSlot(existing, "front", front);
    setSlot(existing, "side",  side);
    setSlot(existing, "back",  back);
    existing.uploadedBy   = user._id;
    existing.uploaderRole = user.role;
    // Re-set status to PENDING on overwrite so trainer reviews the new
    // version. Skip if uploader is the same trainer keeping it reviewed.
    if (existing.status !== "PENDING") existing.status = "PENDING";
    await existing.save();
    doc = existing;
  } else {
    doc = await ProgressPhoto.create({
      clientId:     client._id,
      trainerId:    client.trainerId,
      weekNumber,
      frontPhoto:   fileToPath(front),
      sidePhoto:    fileToPath(side),
      backPhoto:    fileToPath(back),
      uploadedBy:   user._id,
      uploaderRole: user.role,
      status:       "PENDING",
    });
  }

  // Best-effort cleanup of replaced files. Failures are swallowed; the
  // DB record is the source of truth.
  for (const rel of replaced) {
    const full = path.join(UPLOAD_ROOT, path.basename(rel));
    fs.promises.unlink(full).catch(() => { /* ignore */ });
  }

  await activityService.record({
    trainerId: client.trainerId,
    clientId:  client._id,
    actorId:   user._id,
    actorRole: user.role,
    type:      "PROGRESS_PHOTO_UPLOADED",
    entityId:  doc._id,
    summary:   `Week ${weekNumber} photos ${existing ? "updated" : "uploaded"}${client.name ? ` for ${client.name}` : ""}`,
  });

  return doc;
}

async function listForClient(clientId, user) {
  await assertClientAccess(clientId, user);
  return ProgressPhoto.find({ clientId })
    .populate("uploadedBy", "name role")
    .sort({ weekNumber: -1, createdAt: -1 });
}

/** GET /api/progress-photos/me — own photos for CLIENT role. */
async function listForCurrentClient(user) {
  const client = await resolveCurrentClient(user);
  return ProgressPhoto.find({ clientId: client._id })
    .populate("uploadedBy", "name role")
    .sort({ weekNumber: -1, createdAt: -1 });
}

async function loadOwned(id, user) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  const doc = await ProgressPhoto.findById(id);
  if (!doc) throw new ApiError(404, "Progress photo not found");
  if (user.role !== "ADMIN" && String(doc.trainerId) !== String(user._id)) {
    throw new ApiError(403, "Forbidden");
  }
  if (user.role !== "TRAINER" && user.role !== "ADMIN") {
    throw new ApiError(403, "Only trainers may modify progress photos");
  }
  return doc;
}

/**
 * Save / update the trainer's comment. Saving any comment implicitly
 * promotes the record to REVIEWED — matching the existing UX. Use
 * `setStatus` instead when the trainer wants to review without comment.
 */
async function comment(id, user, { comment }) {
  const doc = await loadOwned(id, user);
  doc.comment = comment ?? doc.comment;
  doc.status  = "REVIEWED";
  await doc.save();
  return doc;
}

/**
 * Explicit status transition — lets the trainer mark a set as
 * REVIEWED (no comment needed) or FLAGGED (needs attention).
 */
async function setStatus(id, user, { status }) {
  const doc = await loadOwned(id, user);
  const next = String(status || "").toUpperCase();
  if (!PHOTO_STATUSES.includes(next)) {
    throw new ApiError(400, `status must be one of: ${PHOTO_STATUSES.join(", ")}`);
  }
  doc.status = next;
  await doc.save();
  return doc;
}

/**
 * Hard delete the record and best-effort remove the underlying files.
 * Disk cleanup failures are swallowed — the DB record is the source of
 * truth; orphaned files at worst waste disk and are easy to sweep later.
 */
async function remove(id, user) {
  const doc = await loadOwned(id, user);
  const filePaths = [doc.frontPhoto, doc.sidePhoto, doc.backPhoto].filter(Boolean);
  await ProgressPhoto.deleteOne({ _id: doc._id });
  for (const rel of filePaths) {
    // rel looks like "/uploads/<name>"; resolve to disk path safely.
    const base = path.basename(rel);
    const full = path.join(UPLOAD_ROOT, base);
    fs.promises.unlink(full).catch(() => { /* ignore */ });
  }
  return { _id: doc._id, deleted: true };
}

module.exports = { create, listForClient, listForCurrentClient, comment, setStatus, remove };
