"use strict";

const mongoose = require("mongoose");
const { MEAL_TYPES } = require("./nutritionSchedule.subschema");

/**
 * MealLog — a client's ACTUAL daily meal log, the source of "consumed" macros.
 *
 * One document per (client, day). Each entry is a single logged meal with a
 * photo and a SNAPSHOT of the planned macros taken at log time, so later edits
 * to the nutrition plan never retroactively change days already logged.
 *
 * Consumed macros for a date = SUM of plannedMacros across entries whose
 * status === "reviewed" (a trainer must approve a meal before it counts).
 * Review lifecycle mirrors check-ins: pending → reviewed | action_required.
 */

const MEALLOG_STATUSES = ["pending", "reviewed", "action_required"];

// Embedded Cloudinary asset (same shape used by ProgressPhoto / MealCheckin).
const photoSchema = new mongoose.Schema(
  {
    url:          { type: String, required: true },
    publicId:     { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
  },
  { _id: false }
);

const plannedMacrosSchema = new mongoose.Schema(
  {
    calories: { type: Number, min: 0, default: 0 },
    protein:  { type: Number, min: 0, default: 0 },
    carbs:    { type: Number, min: 0, default: 0 },
    fats:     { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const entrySchema = new mongoose.Schema(
  {
    mealType:      { type: String, enum: MEAL_TYPES, required: true },
    dishesSnapshot: [{ type: String, trim: true, maxlength: 100 }],
    plannedMacros: { type: plannedMacrosSchema, default: () => ({}) },
    photo:         { type: photoSchema, default: undefined },

    status:     { type: String, enum: MEALLOG_STATUSES, default: "pending" },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note:       { type: String, trim: true, maxlength: 1000 },
  },
  { _id: true, timestamps: true }
);

const mealLogSchema = new mongoose.Schema(
  {
    clientId:  { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true },
    // The plan this log was made against (snapshot source). Optional so a log
    // can exist even if the plan is later deleted.
    planId:    { type: mongoose.Schema.Types.ObjectId, ref: "NutritionPlan" },

    // Normalized to UTC midnight for the day this log covers.
    date: { type: Date, required: true },

    entries: { type: [entrySchema], default: [] },
  },
  { timestamps: true }
);

// One log document per client per day.
mealLogSchema.index({ clientId: 1, date: 1 }, { unique: true });
// Trainer review surface — newest first per trainer.
mealLogSchema.index({ trainerId: 1, date: -1 });

const MealLog = mongoose.model("MealLog", mealLogSchema);

module.exports = { MealLog, MEALLOG_STATUSES };
