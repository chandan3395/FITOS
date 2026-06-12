"use strict";

const mongoose = require("mongoose");
const { MealCheckin, MEAL_SLOTS, MEALCHECKIN_STATUSES } = require("../schemas/MealCheckin.schema");
const { Client } = require("../schemas/Client.schema");
const ApiError = require("../utils/ApiError");
const cloudinary = require("../config/cloudinary");
const activityService = require("./activity.service");

const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;

// Access rules mirror progressPhoto.service exactly.
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
 * Normalise an incoming meal-photo payload. The browser uploaded the bytes
 * straight to Cloudinary and sends back the resulting publicId; we re-derive
 * both display + thumbnail URLs so the backend stays authoritative over
 * delivery transforms and never trusts an arbitrary url from the client.
 */
function buildSlot(raw) {
  if (!raw) return undefined;
  const publicId = typeof raw === "string" ? raw : raw.publicId;
  if (!publicId || typeof publicId !== "string") {
    throw new ApiError(400, "Each meal photo must include a Cloudinary publicId");
  }
  return {
    publicId,
    url:          cloudinary.urlFor(publicId),
    thumbnailUrl: cloudinary.thumbnailUrlFor(publicId),
  };
}

/**
 * POST /api/meal-checkins
 * Upsert semantic — one check-in per (clientId, date). Bytes already live in
 * Cloudinary; here we persist metadata only. Meals not provided stay intact.
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

  const date = String(body.date || "");
  if (!DATE_RX.test(date)) throw new ApiError(400, "date (YYYY-MM-DD) is required");

  const incoming = {};
  MEAL_SLOTS.forEach((meal) => { incoming[meal] = buildSlot(body[meal]); });
  if (MEAL_SLOTS.every((meal) => !incoming[meal])) {
    throw new ApiError(400, "At least one meal photo is required");
  }

  const existing = await MealCheckin.findOne({ clientId: client._id, date });

  // Track stale assets to destroy after the DB write (deterministic ids mean
  // this is normally empty — overwrite-in-place — but we guard anyway).
  const stale = [];
  let doc;
  if (existing) {
    MEAL_SLOTS.forEach((meal) => {
      const next = incoming[meal];
      if (!next) return;
      const prev = existing[meal];
      if (prev?.publicId && prev.publicId !== next.publicId) stale.push(prev.publicId);
      existing[meal] = next;
    });
    if (body.note !== undefined) existing.note = body.note;
    existing.uploadedBy   = user._id;
    existing.uploaderRole = user.role;
    // A fresh upload resets the review state so the trainer re-reviews.
    if (existing.status !== "PENDING") existing.status = "PENDING";
    await existing.save();
    doc = existing;
  } else {
    const data = {
      clientId:     client._id,
      trainerId:    client.trainerId,
      date,
      note:         body.note,
      uploadedBy:   user._id,
      uploaderRole: user.role,
      status:       "PENDING",
    };
    MEAL_SLOTS.forEach((meal) => { if (incoming[meal]) data[meal] = incoming[meal]; });
    doc = await MealCheckin.create(data);
  }

  // Best-effort orphan cleanup; the DB record is the source of truth.
  for (const publicId of stale) {
    cloudinary.destroy(publicId).catch(() => { /* ignore */ });
  }

  await activityService.record({
    trainerId: client.trainerId,
    clientId:  client._id,
    actorId:   user._id,
    actorRole: user.role,
    type:      "MEAL_CHECKIN_UPLOADED",
    entityId:  doc._id,
    summary:   `Meal check-in for ${date}${client.name ? ` — ${client.name}` : ""} ${existing ? "updated" : "uploaded"}`,
  });

  return doc;
}

async function listForClient(clientId, user) {
  await assertClientAccess(clientId, user);
  return MealCheckin.find({ clientId })
    .populate("uploadedBy", "name role")
    .sort({ date: -1, createdAt: -1 });
}

/** GET /api/meal-checkins/me — own check-ins for CLIENT role. */
async function listForCurrentClient(user) {
  const client = await resolveCurrentClient(user);
  return MealCheckin.find({ clientId: client._id })
    .populate("uploadedBy", "name role")
    .sort({ date: -1, createdAt: -1 });
}

async function loadOwned(id, user) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  const doc = await MealCheckin.findById(id);
  if (!doc) throw new ApiError(404, "Meal check-in not found");
  if (user.role !== "ADMIN" && String(doc.trainerId) !== String(user._id)) {
    throw new ApiError(403, "Forbidden");
  }
  if (user.role !== "TRAINER" && user.role !== "ADMIN") {
    throw new ApiError(403, "Only trainers may review meal check-ins");
  }
  return doc;
}

/**
 * Save the trainer's comment. Saving a comment implicitly approves
 * (REVIEWED) the check-in — matching the progress-photo UX.
 */
async function comment(id, user, { comment }) {
  const doc = await loadOwned(id, user);
  doc.comment = comment ?? doc.comment;
  doc.status  = "REVIEWED";
  await doc.save();
  return doc;
}

/** Explicit status transition — REVIEWED (approved) or FLAGGED. */
async function setStatus(id, user, { status }) {
  const doc = await loadOwned(id, user);
  const next = String(status || "").toUpperCase();
  if (!MEALCHECKIN_STATUSES.includes(next)) {
    throw new ApiError(400, `status must be one of: ${MEALCHECKIN_STATUSES.join(", ")}`);
  }
  doc.status = next;
  await doc.save();
  return doc;
}

/** Hard delete the record and its Cloudinary assets (best-effort). */
async function remove(id, user) {
  const doc = await loadOwned(id, user);
  const publicIds = MEAL_SLOTS
    .map((meal) => doc[meal]?.publicId)
    .filter(Boolean);
  await MealCheckin.deleteOne({ _id: doc._id });
  for (const publicId of publicIds) {
    cloudinary.destroy(publicId).catch(() => { /* ignore */ });
  }
  return { _id: doc._id, deleted: true };
}

module.exports = { create, listForClient, listForCurrentClient, comment, setStatus, remove };
