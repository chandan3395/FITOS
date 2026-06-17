"use strict";

const mongoose = require("mongoose");
const { setDetailSchema } = require("./workoutSetDetail.subschema");

// Templates are trainer-private blueprints — independent from any client
// plan. They follow a much simpler lifecycle than plans (no DRAFT stage),
// since "draft template" doesn't have a clear meaning: until you assign
// the template, it has no effect on anyone.
const WORKOUT_TEMPLATE_STATUSES = ["ACTIVE", "ARCHIVED"];

const EXERCISE_FIELDS = {
  name:        { type: String, required: true, trim: true },
  sets:        { type: Number, min: 1, max: 20 },
  reps:        { type: Number, min: 1, max: 100 },
  weight:      { type: Number, min: 0 },
  restSeconds: { type: Number, min: 0, max: 600 },
  dayNumber:   { type: Number, min: 1 },
  order:       { type: Number, min: 1 },
  notes:       { type: String, trim: true, maxlength: 1000 },

  // Per-set details (v2; optional) — snapshotted by value on assign.
  setDetails:  { type: [setDetailSchema], default: undefined },
};

const workoutTemplateSchema = new mongoose.Schema(
  {
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    name:          { type: String, required: true, trim: true, maxlength: 200 },
    description:   { type: String, trim: true, maxlength: 2000 },
    durationWeeks: { type: Number, min: 1, max: 52 },
    notes:         { type: String, trim: true, maxlength: 2000 },
    status:        { type: String, enum: WORKOUT_TEMPLATE_STATUSES, default: "ACTIVE" },

    exercises:     [EXERCISE_FIELDS],
  },
  { timestamps: true }
);

workoutTemplateSchema.index({ trainerId: 1, status: 1, updatedAt: -1 });

const WorkoutTemplate = mongoose.model("WorkoutTemplate", workoutTemplateSchema);

module.exports = { WorkoutTemplate, WORKOUT_TEMPLATE_STATUSES };
