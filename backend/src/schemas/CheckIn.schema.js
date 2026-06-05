"use strict";

const mongoose = require("mongoose");

const CHECKIN_STATUSES = ["PENDING", "REVIEWED", "FLAGGED"];

const checkInSchema = new mongoose.Schema(
  {
    clientId:  { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true },

    weight: { type: Number },           // kg
    sleep:  { type: Number },           // hours
    water:  { type: Number },           // litres
    energy: { type: Number, min: 1, max: 5 },
    mood:   { type: Number, min: 1, max: 5 },
    notes:  { type: String, trim: true },

    status:          { type: String, enum: CHECKIN_STATUSES, default: "PENDING" },
    trainerComment:  { type: String, trim: true },
    reviewedAt:      { type: Date },
  },
  { timestamps: true }
);

// Trainer's "show me everything for my clients" view:
checkInSchema.index({ trainerId: 1, status: 1, createdAt: -1 });
// Client profile timeline:
checkInSchema.index({ clientId: 1, createdAt: -1 });

const CheckIn = mongoose.model("CheckIn", checkInSchema);

module.exports = { CheckIn, CHECKIN_STATUSES };
