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
  if (user.role !== "ADMIN" && String(client.trainerId) !== String(user._id)) {
    throw new ApiError(403, "Forbidden");
  }
  return client;
}

function fileToPath(file) {
  return file ? `/uploads/${file.filename}` : undefined;
}

/**
 * POST /api/progress-photos
 * Body  (multipart): clientId, weekNumber
 * Files: front, side, back (any subset)
 */
async function create(user, body, files = {}) {
  const client = await assertClientAccess(body.clientId, user);
  const weekNumber = Number(body.weekNumber);
  if (!weekNumber || weekNumber < 1) throw new ApiError(400, "weekNumber is required");

  const front = files.front?.[0];
  const side  = files.side?.[0];
  const back  = files.back?.[0];
  if (!front && !side && !back) throw new ApiError(400, "At least one photo is required");

  const doc = await ProgressPhoto.create({
    clientId:   client._id,
    trainerId:  client.trainerId,
    weekNumber,
    frontPhoto: fileToPath(front),
    sidePhoto:  fileToPath(side),
    backPhoto:  fileToPath(back),
    status:     "PENDING",
  });

  await activityService.record({
    trainerId: client.trainerId,
    clientId:  client._id,
    actorId:   user._id,
    actorRole: user.role,
    type:      "PROGRESS_PHOTO_UPLOADED",
    entityId:  doc._id,
    summary:   `Week ${weekNumber} photos uploaded${client.name ? ` for ${client.name}` : ""}`,
  });

  return doc;
}

async function listForClient(clientId, user) {
  await assertClientAccess(clientId, user);
  return ProgressPhoto.find({ clientId }).sort({ weekNumber: -1, createdAt: -1 });
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

module.exports = { create, listForClient, comment, setStatus, remove };
