"use strict";
const mongoose = require("mongoose");
const options = { _id: false, strict: "throw" };
const fields = {
  id: String,
  name: String,
  sets: Number,
  reps: String,
  weightKg: Number,
  restSeconds: Number,
  notes: String,
};
const exercise = new mongoose.Schema(fields, options);
const dailyExercise = new mongoose.Schema(
  { ...fields, completed: Boolean, completedAt: Date },
  options
);
const day = new mongoose.Schema(
  {
    day: String,
    label: String,
    kind: { type: String, enum: ["unconfigured", "workout", "rest"] },
    exercises: [exercise],
  },
  options
);
const receipt = new mongoose.Schema({ key: String, hash: String }, options);
const common = {
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
  version: { type: Number, required: true },
  receipts: { type: [receipt], default: [], select: false },
};
const routine = new mongoose.Schema(
  { ...common, name: String, days: [day], deleted: { type: Boolean, default: false } },
  { timestamps: true, strict: "throw" }
);
routine.index({ ownerId: 1 }, { unique: true });
const daily = new mongoose.Schema(
  {
    ...common,
    date: { type: String, required: true, immutable: true },
    timezoneAtCreation: { type: String, required: true, immutable: true },
    startedAt: { type: Date, required: true, immutable: true },
    sourceRoutineVersion: { type: Number, required: true, immutable: true },
    routineName: String,
    label: String,
    kind: String,
    exercises: [dailyExercise],
  },
  { timestamps: true, strict: "throw" }
);
daily.index({ ownerId: 1, date: 1 }, { unique: true });
module.exports = {
  ByotWorkoutRoutine: mongoose.model("ByotWorkoutRoutine", routine),
  ByotDailyWorkout: mongoose.model("ByotDailyWorkout", daily),
};
