"use strict";

const mongoose = require("mongoose");

/**
 * Tracks when a client completes an exercise in a workout plan.
 *
 * Used to monitor client progress and adherence to workout plans.
 */
const workoutCompletionSchema = new mongoose.Schema(
  {
    // ── References ───────────────────────────────────────────
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true
    },
    workoutPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkoutPlan",
      required: true
    },
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    // ── Completion Details ───────────────────────────────────
    completedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Indexes for efficient querying
workoutCompletionSchema.index({ clientId: 1, workoutPlanId: 1 });
workoutCompletionSchema.index({ clientId: 1, completedAt: -1 });
workoutCompletionSchema.index({ workoutPlanId: 1 });
workoutCompletionSchema.index(
  { clientId: 1, workoutPlanId: 1, exerciseId: 1 },
  { unique: true }
);

const WorkoutCompletion = mongoose.model("WorkoutCompletion", workoutCompletionSchema);

module.exports = { WorkoutCompletion };
