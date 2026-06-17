"use strict";

const mongoose = require("mongoose");
const { setDetailSchema } = require("./workoutSetDetail.subschema");

const EXERCISE_FIELDS = {
  name: { type: String, required: true, trim: true },
  sets: { type: Number, min: 1, max: 20 },
  reps: { type: Number, min: 1, max: 100 },
  weight: { type: Number, min: 0 },
  restSeconds: { type: Number, min: 0, max: 600 },
  dayNumber: { type: Number, min: 1 },
  order: { type: Number, min: 1 },
  notes: { type: String, trim: true, maxlength: 1000 },

  // ── Per-set details (v2; optional) ───────────────────────────
  // When present, length === the exercise's number of sets and each row holds
  // its own weight/reps/restSeconds. Absent for legacy flat exercises, which
  // keep the flat sets/reps/weight fields above.
  setDetails: { type: [setDetailSchema], default: undefined }
};

const WORKOUT_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"];

/**
 * Workout plan assigned to a client.
 *
 * A trainer creates workout plans for their clients.
 * Each plan contains exercises organized by day and order.
 */
const workoutPlanSchema = new mongoose.Schema(
  {
    // ── Ownership ────────────────────────────────────────────
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true
    },

    // ── Plan Details ─────────────────────────────────────────
    planName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    goal: {
      type: String,
      trim: true,
      maxlength: 200
    },
    durationWeeks: {
      type: Number,
      min: 1,
      max: 52
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000
    },
    // New plans start as DRAFT so trainers can iterate before the client sees
    // them. Promote to ACTIVE via the explicit publish endpoint; archive
    // moves to ARCHIVED; the hard-delete endpoint removes the document.
    status: {
      type: String,
      enum: WORKOUT_STATUSES,
      default: "DRAFT"
    },

    // ── Exercises ────────────────────────────────────────────
    exercises: [EXERCISE_FIELDS]
  },
  { timestamps: true }
);

// Indexes for efficient querying
workoutPlanSchema.index({ clientId: 1 });
workoutPlanSchema.index({ clientId: 1, status: 1 });
workoutPlanSchema.index({ "exercises.dayNumber": 1 });
workoutPlanSchema.index({ "exercises.order": 1 });

const WorkoutPlan = mongoose.model("WorkoutPlan", workoutPlanSchema);

module.exports = { WorkoutPlan, WORKOUT_STATUSES, EXERCISE_FIELDS };
