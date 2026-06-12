"use strict";

const mongoose = require("mongoose");

/**
 * Per-trainer activity feed.
 *
 * Every notable workspace event (client created, invite activated, plan
 * published, check-in submitted, photo uploaded, etc.) writes one record
 * here. The trainer dashboard reads its "Recent Activity" panel directly
 * from this collection — there is no mock fallback.
 *
 * Records are append-only; no editing or deletion API. Worst-case the
 * collection grows large, in which case a TTL/sweep job can be added —
 * but the structure here is index-friendly for newest-first scans.
 */
const ACTIVITY_TYPES = [
  "CLIENT_CREATED",
  "INVITE_SENT",
  "WHATSAPP_INVITE_SENT",
  "INVITE_ACTIVATED",
  "ACCOUNT_LINKED",
  "EMAIL_MISMATCH_DETECTED",
  "CLIENT_DETAILS_UPDATED",
  "CLIENT_EMAIL_UPDATED",
  "CLIENT_DELETED",
  "INVITE_REGENERATED",
  "INVITE_INVALIDATED",
  "WORKOUT_PUBLISHED",
  "NUTRITION_PUBLISHED",
  "CHECKIN_SUBMITTED",
  "PROGRESS_PHOTO_UPLOADED",
  "MEAL_CHECKIN_UPLOADED",
  "MEAL_PHOTO_UPLOADED",
  "WORKOUT_COMPLETED",
  "EXERCISE_COMPLETED",
  "TODAYS_WORKOUT_VIEWED",
  "TRAINER_DISABLED_LOGIN_ATTEMPT",
];

const ACTOR_ROLES = ["TRAINER", "CLIENT", "ADMIN", "SYSTEM"];

const activityLogSchema = new mongoose.Schema(
  {
    // Whose feed this belongs to. Required for the dashboard query path.
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Optional client reference — most events relate to a specific client.
    clientId:  { type: mongoose.Schema.Types.ObjectId, ref: "Client" },

    // Who triggered the event (the trainer themselves, the client, etc.).
    actorId:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorRole: { type: String, enum: ACTOR_ROLES, default: "SYSTEM" },

    // Free-form pointer to whatever the event is about (plan id, photo id,
    // check-in id…). The collection is heterogeneous, so we don't constrain.
    entityId:  { type: mongoose.Schema.Types.ObjectId },

    type:      { type: String, enum: ACTIVITY_TYPES, required: true },
    summary:   { type: String, required: true, trim: true, maxlength: 240 },
    metadata:  { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Newest-first lookup for "Recent Activity" widget.
activityLogSchema.index({ trainerId: 1, createdAt: -1 });

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

module.exports = { ActivityLog, ACTIVITY_TYPES, ACTOR_ROLES };
