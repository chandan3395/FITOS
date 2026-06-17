"use strict";

const mongoose = require("mongoose");

/**
 * Shared per-SET subschema for Workout Plan v2, reused by both WorkoutPlan and
 * WorkoutTemplate exercises so the two stay in lock-step.
 *
 * Each set carries its own weight/reps/restSeconds, so set 1 can be 50kg and
 * set 2 100kg. `setDetails` is OPTIONAL everywhere: a legacy flat exercise has
 * no setDetails and keeps using the flat sets/reps/weight fields on the parent
 * exercise. The "exactly N rows for N sets" and "reps >= 1" rules are enforced
 * at the validator / publish layers, not here, so DRAFTs can be incomplete.
 */
const setDetailSchema = new mongoose.Schema(
  {
    setNumber:   { type: Number, min: 1 },          // 1-indexed
    weight:      { type: Number, min: 0, default: 0 },
    reps:        { type: Number, min: 0, default: 0 }, // reps >= 1 enforced at publish
    restSeconds: { type: Number, min: 0, max: 600, default: 0 },
  },
  { _id: true }
);

module.exports = { setDetailSchema };
