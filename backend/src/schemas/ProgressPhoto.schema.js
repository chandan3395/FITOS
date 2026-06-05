"use strict";

const mongoose = require("mongoose");

const PHOTO_STATUSES = ["PENDING", "REVIEWED", "FLAGGED"];

const progressPhotoSchema = new mongoose.Schema(
  {
    clientId:   { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    trainerId:  { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true },
    weekNumber: { type: Number, required: true, min: 1 },

    frontPhoto: { type: String }, // /uploads/<filename>
    sidePhoto:  { type: String },
    backPhoto:  { type: String },

    comment: { type: String, trim: true },
    status:  { type: String, enum: PHOTO_STATUSES, default: "PENDING" },
  },
  { timestamps: true }
);

progressPhotoSchema.index({ clientId: 1, weekNumber: -1 });
progressPhotoSchema.index({ trainerId: 1, status: 1, createdAt: -1 });

const ProgressPhoto = mongoose.model("ProgressPhoto", progressPhotoSchema);

module.exports = { ProgressPhoto, PHOTO_STATUSES };
