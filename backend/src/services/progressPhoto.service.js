"use strict";

const mongoose = require("mongoose");
const { ProgressPhoto, PHOTO_STATUSES } = require("../schemas/ProgressPhoto.schema");
const { Client } = require("../schemas/Client.schema");
const ApiError = require("../utils/ApiError");
const cloudinary = require("../config/cloudinary");
const activityService = require("./activity.service");

const SLOTS = ["front", "side", "back"];

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

/**
 * Normalise an incoming slot payload from the client. The browser uploads
 * directly to Cloudinary, then sends us back the resulting `publicId` (and
 * optionally the `url`). We re-derive both display + thumbnail URLs from the
 * publicId so the backend stays authoritative over delivery transforms and
 * never trusts an arbitrary url from the client.
 */
function buildSlot(raw) {
  if (!raw) return undefined;
  const publicId = typeof raw === "string" ? raw : raw.publicId;
  if (!publicId || typeof publicId !== "string") {
    throw new ApiError(400, "Each photo must include a Cloudinary publicId");
  }
  return {
    publicId,
    url:          cloudinary.urlFor(publicId),
    thumbnailUrl: cloudinary.thumbnailUrlFor(publicId),
  };
}

/**
 * POST /api/progress-photos
 * Upsert semantic — one photo set per (clientId, weekNumber). The browser
 * has already uploaded the image bytes straight to Cloudinary; here we only
 * persist metadata. Slots not provided are left intact.
 *
 * Cloudinary publicIds are deterministic per (client, week, slot) and the
 * signed upload uses overwrite=true, so replacing a slot reuses the same
 * asset id (no orphans). If a provided publicId ever differs from the one
 * already stored, we destroy the stale asset after the DB write succeeds.
 *
 * - TRAINER / ADMIN: must pass `clientId` in body.
 * - CLIENT:          `clientId` resolved from auth (their own Client doc).
 */
async function create(user, body) {
  let client;
  if (user.role === "CLIENT") {
    client = await resolveCurrentClient(user);
  } else {
    client = await assertClientAccess(body.clientId, user);
  }

  const weekNumber = Number(body.weekNumber);
  if (!weekNumber || weekNumber < 1) throw new ApiError(400, "weekNumber is required");

  const incoming = {
    front: buildSlot(body.front),
    side:  buildSlot(body.side),
    back:  buildSlot(body.back),
  };
  if (!incoming.front && !incoming.side && !incoming.back) {
    throw new ApiError(400, "At least one photo is required");
  }

  const existing = await ProgressPhoto.findOne({ clientId: client._id, weekNumber });

  // Track stale Cloudinary assets to destroy after the DB write. With
  // deterministic ids this is normally empty (overwrite-in-place), but we
  // guard against a publicId ever changing so we never orphan an asset.
  const stale = [];
  const applySlot = (doc, slot) => {
    const next = incoming[slot];
    if (!next) return;
    const prev = doc[`${slot}Photo`];
    if (prev?.publicId && prev.publicId !== next.publicId) stale.push(prev.publicId);
    doc[`${slot}Photo`] = next;
  };

  let doc;
  if (existing) {
    SLOTS.forEach((slot) => applySlot(existing, slot));
    existing.uploadedBy   = user._id;
    existing.uploaderRole = user.role;
    if (existing.status !== "PENDING") existing.status = "PENDING";
    await existing.save();
    doc = existing;
  } else {
    doc = await ProgressPhoto.create({
      clientId:     client._id,
      trainerId:    client.trainerId,
      weekNumber,
      frontPhoto:   incoming.front,
      sidePhoto:    incoming.side,
      backPhoto:    incoming.back,
      uploadedBy:   user._id,
      uploaderRole: user.role,
      status:       "PENDING",
    });
  }

  // Best-effort orphan cleanup. The DB record is the source of truth.
  for (const publicId of stale) {
    cloudinary.destroy(publicId).catch(() => { /* ignore */ });
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
 * Hard delete the record and its Cloudinary assets. Asset destruction is
 * best-effort but attempted for every slot so no orphans are left behind.
 */
async function remove(id, user) {
  const doc = await loadOwned(id, user);
  const publicIds = SLOTS
    .map((slot) => doc[`${slot}Photo`]?.publicId)
    .filter(Boolean);
  await ProgressPhoto.deleteOne({ _id: doc._id });
  for (const publicId of publicIds) {
    cloudinary.destroy(publicId).catch(() => { /* ignore */ });
  }
  return { _id: doc._id, deleted: true };
}

module.exports = { create, listForClient, listForCurrentClient, comment, setStatus, remove };
