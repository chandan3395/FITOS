"use strict";

const mongoose = require("mongoose");
const { ActivityLog, ACTIVITY_TYPES } = require("../schemas/ActivityLog.schema");
const { Client } = require("../schemas/Client.schema");
const ApiError = require("../utils/ApiError");
const logger = require("../config/logger");

// Event types a CLIENT is allowed to see in their own Recent Activity feed.
// Trainer-private events (email-mismatch audit, email/details edits made by
// the trainer, deletion, disabled-login attempts, "viewed" telemetry) are
// intentionally excluded.
const CLIENT_VISIBLE_TYPES = [
  "WORKOUT_PUBLISHED",
  "NUTRITION_PUBLISHED",
  "CHECKIN_SUBMITTED",
  "PROGRESS_PHOTO_UPLOADED",
  "MEAL_CHECKIN_UPLOADED",
  "MEAL_PHOTO_UPLOADED",
  "MEAL_LOGGED",
  "MEAL_REVIEWED",
  "WORKOUT_COMPLETED",
  "EXERCISE_COMPLETED",
  "ACCOUNT_LINKED",
  "INVITE_ACTIVATED",
  "CLIENT_DETAILS_UPDATED",
];

/**
 * Append an activity record. Designed to be non-throwing — any failure is
 * logged and swallowed so an activity write can never break the originating
 * domain operation (creating a client, publishing a plan, etc.). The trainer
 * dashboard can survive missing entries; it cannot survive a 500 on plan
 * publish because activity logging fell over.
 */
async function record({ trainerId, type, clientId, actorId, actorRole, entityId, summary, metadata }) {
  try {
    if (!trainerId) return null;
    if (!ACTIVITY_TYPES.includes(type)) {
      logger.warn("[activity] unknown type", { type });
      return null;
    }
    if (!summary) return null;
    return await ActivityLog.create({
      trainerId,
      clientId:  clientId  || undefined,
      actorId:   actorId   || undefined,
      actorRole: actorRole || "SYSTEM",
      entityId:  entityId  || undefined,
      type,
      summary,
      metadata:  metadata  || {},
    });
  } catch (e) {
    logger.error("[activity] record failed", { message: e?.message });
    return null;
  }
}

/**
 * GET /api/activity — newest-first feed, scoped to the trainer's own
 * workspace. Admin may pass `?trainerId=...` to inspect a specific
 * trainer's feed (support / debugging); without it admin sees no rows
 * (privacy rule mirrors the rest of the trainer surface).
 */
async function listForUser(user, { limit = 20, trainerId: trainerIdParam } = {}) {
  if (user.role !== "TRAINER" && user.role !== "ADMIN") {
    throw new ApiError(403, "Forbidden");
  }

  let trainerId;
  if (user.role === "TRAINER") {
    trainerId = user._id;
  } else if (trainerIdParam && mongoose.isValidObjectId(trainerIdParam)) {
    trainerId = trainerIdParam;
  } else {
    return [];
  }

  const cap = Math.max(1, Math.min(Number(limit) || 20, 100));
  return ActivityLog.find({ trainerId })
    .populate("clientId", "name")
    .sort({ createdAt: -1 })
    .limit(cap)
    .lean();
}

/**
 * GET /api/activity/me — newest-first feed for the signed-in CLIENT,
 * scoped to their own client profile and filtered to client-visible event
 * types. Resolves the Client by userId (relationships are keyed by clientId,
 * never email). Returns [] when the user has no active client profile.
 */
async function listForClientUser(user, { limit = 20 } = {}) {
  if (user.role !== "CLIENT") {
    throw new ApiError(403, "Forbidden");
  }

  const client = await Client.findOne({ userId: user._id, isDeleted: { $ne: true } }).select("_id");
  if (!client) return [];

  const cap = Math.max(1, Math.min(Number(limit) || 20, 100));
  return ActivityLog.find({
    clientId: client._id,
    type: { $in: CLIENT_VISIBLE_TYPES },
  })
    .sort({ createdAt: -1 })
    .limit(cap)
    .lean();
}

module.exports = { record, listForUser, listForClientUser, CLIENT_VISIBLE_TYPES };
