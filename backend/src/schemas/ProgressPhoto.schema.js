"use strict";

const mongoose = require("mongoose");

const PHOTO_STATUSES = ["PENDING", "REVIEWED", "FLAGGED"];
const UPLOADER_ROLES = ["TRAINER", "CLIENT", "ADMIN"];

// Each photo slot now points at a Cloudinary asset instead of a local
// file path. We persist only the fields we need — never the raw upload
// response — so the document stays small and stable.
//   publicId     — deterministic Cloudinary id (fitos/clients/.../front)
//   url          — secure delivery URL for full-size viewing
//   thumbnailUrl — square, downscaled URL for grids / lists / week cards
const photoSlotSchema = new mongoose.Schema(
  {
    publicId:     { type: String, required: true },
    url:          { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
  },
  { _id: false }
);

const progressPhotoSchema = new mongoose.Schema(
  {
    clientId:   { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    trainerId:  { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true },
    weekNumber: { type: Number, required: true, min: 1 },

    frontPhoto: { type: photoSlotSchema, default: undefined },
    sidePhoto:  { type: photoSlotSchema, default: undefined },
    backPhoto:  { type: photoSlotSchema, default: undefined },

    // Who last touched this set. The upsert path in the service updates
    // this on every write so the client/trainer pages can show "uploaded
    // by trainer" vs. "uploaded by you".
    uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploaderRole: { type: String, enum: UPLOADER_ROLES },

    comment: { type: String, trim: true },
    status:  { type: String, enum: PHOTO_STATUSES, default: "PENDING" },
  },
  { timestamps: true }
);

// One photo set per (client, week). Trying to create a second triggers
// the duplicate-key error which the service catches and converts into
// the upsert path — neither trainer nor client can race-create a duplicate.
progressPhotoSchema.index({ clientId: 1, weekNumber: 1 }, { unique: true });
progressPhotoSchema.index({ trainerId: 1, status: 1, createdAt: -1 });

const ProgressPhoto = mongoose.model("ProgressPhoto", progressPhotoSchema);

module.exports = { ProgressPhoto, PHOTO_STATUSES, UPLOADER_ROLES };
