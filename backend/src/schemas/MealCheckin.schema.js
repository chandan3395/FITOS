"use strict";

const mongoose = require("mongoose");

// A meal check-in is one day's worth of meal photos for a client — proof of
// adherence to their nutrition plan. Mirrors ProgressPhoto: the browser uploads
// bytes straight to Cloudinary and we persist only the derived metadata.
const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"];
// REVIEWED == "Approved" in the trainer-facing UI.
const MEALCHECKIN_STATUSES = ["PENDING", "REVIEWED", "FLAGGED"];
const UPLOADER_ROLES = ["TRAINER", "CLIENT", "ADMIN"];

const mealSlotSchema = new mongoose.Schema(
  {
    publicId:     { type: String, required: true },
    url:          { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
  },
  { _id: false }
);

const mealCheckinSchema = new mongoose.Schema(
  {
    clientId:  { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true },

    // The local calendar day this check-in covers, as YYYY-MM-DD. Used as the
    // uniqueness key and the deterministic Cloudinary folder segment, so it is
    // immune to timezone drift (the client sends their own local day).
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },

    breakfast: { type: mealSlotSchema, default: undefined },
    lunch:     { type: mealSlotSchema, default: undefined },
    dinner:    { type: mealSlotSchema, default: undefined },
    snack:     { type: mealSlotSchema, default: undefined },

    // The client's optional note for the day ("ate out at lunch", etc.).
    note: { type: String, trim: true, maxlength: 1000 },

    uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploaderRole: { type: String, enum: UPLOADER_ROLES },

    // Trainer review.
    comment: { type: String, trim: true, maxlength: 1000 },
    status:  { type: String, enum: MEALCHECKIN_STATUSES, default: "PENDING" },
  },
  { timestamps: true }
);

// One check-in per (client, day). A second create hits the duplicate-key
// error which the service converts into the upsert path — no races/dupes.
mealCheckinSchema.index({ clientId: 1, date: 1 }, { unique: true });
mealCheckinSchema.index({ trainerId: 1, status: 1, createdAt: -1 });

const MealCheckin = mongoose.model("MealCheckin", mealCheckinSchema);

module.exports = { MealCheckin, MEAL_SLOTS, MEALCHECKIN_STATUSES, UPLOADER_ROLES };
