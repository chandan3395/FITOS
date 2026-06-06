"use strict";

const mongoose = require("mongoose");
const { ActivityLog, ACTIVITY_TYPES } = require("../schemas/ActivityLog.schema");
const ApiError = require("../utils/ApiError");

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
      // eslint-disable-next-line no-console
      console.warn("[activity] unknown type", type);
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
    // eslint-disable-next-line no-console
    console.error("[activity] record failed", e?.message);
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

module.exports = { record, listForUser };
