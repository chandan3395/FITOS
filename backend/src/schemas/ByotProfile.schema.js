"use strict";
const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      immutable: true,
    },
    startingWeightKg: Number,
    heightCm: Number,
    goal: String,
    targetWeightKg: Number,
    timezone: String,
    onboardingCompletedAt: Date,
    checkInAnchorDate: String,
  },
  { timestamps: true, strict: "throw" }
);
module.exports.ByotProfile = mongoose.model("ByotProfile", schema);
