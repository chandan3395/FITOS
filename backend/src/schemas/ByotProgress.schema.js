"use strict";
const mongoose = require("mongoose");
const sub = { _id: false, strict: "throw" };
const FIELDS = [
  "weightKg",
  "chestCm",
  "waistCm",
  "hipsCm",
  "leftArmCm",
  "rightArmCm",
  "leftThighCm",
  "rightThighCm",
];
const measurement = new mongoose.Schema(
  Object.fromEntries(FIELDS.map((key) => [key, { type: Number, default: null }])),
  sub
);
const photo = new mongoose.Schema(
  {
    attemptId: String,
    publicId: String,
    assetId: String,
    bytes: Number,
    width: Number,
    height: Number,
    format: String,
  },
  sub
);
const checkin = new mongoose.Schema(
  {
    active: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    photos: {
      front: { type: photo, default: null },
      side: { type: photo, default: null },
      back: { type: photo, default: null },
    },
    pending: {
      front: { type: String, default: null },
      side: { type: String, default: null },
      back: { type: String, default: null },
    },
  },
  sub
);
const progress = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
    date: { type: String, required: true, immutable: true },
    timezoneAtCreation: { type: String, required: true, immutable: true },
    version: { type: Number, required: true },
    measurements: { type: measurement, default: () => ({}) },
    notes: { type: String, default: "" },
    checkin: { type: checkin, default: () => ({}) },
    receipts: {
      type: [new mongoose.Schema({ key: String, hash: String }, sub)],
      default: [],
      select: false,
    },
  },
  { timestamps: true, strict: "throw" }
);
progress.index({ ownerId: 1, date: 1 }, { unique: true });
progress.index({ ownerId: 1, "checkin.completedAt": 1, date: -1 });
const attempt = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
    id: { type: String, required: true, immutable: true },
    date: String,
    slot: String,
    requestKey: String,
    requestHash: String,
    publicId: String,
    reserved: { type: Boolean, default: false },
    state: {
      type: String,
      enum: ["issued", "uploading", "ready", "attached", "cleanup", "deleted"],
      default: "issued",
    },
    expiresAt: Date,
    leaseUntil: Date,
    nextCleanupAt: Date,
    purgeAt: Date,
    failures: { type: Number, default: 0 },
    contentHash: String,
    verified: { type: photo, default: null },
  },
  { timestamps: true, strict: "throw" }
);
attempt.index({ ownerId: 1, id: 1 }, { unique: true });
attempt.index({ ownerId: 1, requestKey: 1 }, { unique: true });
attempt.index({ nextCleanupAt: 1, state: 1 });
attempt.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
const budget = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    day: String,
    count: { type: Number, default: 0 },
    pending: { type: [String], default: [] },
  },
  { strict: "throw" }
);
budget.index({ ownerId: 1 }, { unique: true });
module.exports = {
  FIELDS,
  ByotProgress: mongoose.model("ByotProgress", progress),
  ByotPhotoAttempt: mongoose.model("ByotPhotoAttempt", attempt),
  ByotPhotoBudget: mongoose.model("ByotPhotoBudget", budget),
};
