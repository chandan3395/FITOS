"use strict";

const mongoose = require("mongoose");

// PENDING — created by a trainer, invite issued, not yet activated/linked.
// ACTIVE  — the client has linked a Google account and can sign in.
// ARCHIVED — soft-deleted by the trainer.
const CLIENT_STATUSES = ["PENDING", "ACTIVE", "ARCHIVED"];
const GENDER_OPTIONS  = ["MALE", "FEMALE", "OTHER"];

/**
 * Client onboarding record.
 *
 * All onboarding fields below were collected by the Add Client wizard
 * but previously dropped at the backend boundary. They are now first-
 * class schema paths.
 *
 * Every newly-added field is OPTIONAL. Existing client documents created
 * before this expansion continue to read/write without migration —
 * unset paths simply return `undefined`.
 *
 * Range bounds mirror `validators/clientPayload.validator.js`. The
 * validator is the authority for input validation; the schema constraints
 * are a defense-in-depth backstop against bypasses.
 */
const clientSchema = new mongoose.Schema(
  {
    // ── Ownership ────────────────────────────────────────────
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // ── Identity ─────────────────────────────────────────────
    name:       { type: String, required: true, trim: true },
    phone:      { type: String, trim: true },
    email:      { type: String, lowercase: true, trim: true, sparse: true },
    gender:     { type: String, enum: GENDER_OPTIONS },
    dob:        { type: Date },                                   // NEW
    age:        { type: Number, min: 1, max: 120 },               // computed from dob if not supplied
    city:       { type: String, trim: true },
    occupation: { type: String, trim: true, maxlength: 200 },     // NEW

    // ── Body ─────────────────────────────────────────────────
    height:         { type: Number, min: 80,  max: 250 },
    startingWeight: { type: Number, min: 20,  max: 300 },
    bodyFat:        { type: Number, min: 1,   max: 60  },         // NEW

    // ── Health history ───────────────────────────────────────
    medicalConditions: { type: String, trim: true, maxlength: 1000 }, // NEW
    medications:       { type: String, trim: true, maxlength: 1000 }, // NEW
    pastInjuries:      { type: String, trim: true, maxlength: 1000 }, // NEW
    allergies:         { type: String, trim: true, maxlength: 1000 }, // NEW

    // ── Goal & program ───────────────────────────────────────
    goal:            { type: String, trim: true, maxlength: 200 },
    targetWeight:    { type: Number, min: 20,  max: 300 },
    targetBodyFat:   { type: Number, min: 1,   max: 60  },                // NEW
    timeline:        { type: String, trim: true, maxlength: 60 },         // NEW
    goalDescription: { type: String, trim: true, maxlength: 2000 },       // NEW
    startDate:       { type: Date },                                       // NEW
    duration:        { type: String, trim: true, maxlength: 60 },         // NEW
    sessionFrequency:{ type: String, trim: true, maxlength: 60 },         // NEW

    // ── Nutrition ────────────────────────────────────────────
    diet:         { type: String, trim: true, maxlength: 60   },          // NEW
    calories:     { type: Number, min: 800, max: 6000 },                  // NEW
    protein:      { type: Number, min: 20,  max: 500  },                  // NEW
    carbs:        { type: Number, min: 20,  max: 1000 },                  // NEW
    fats:         { type: Number, min: 10,  max: 300  },                  // NEW
    mealsPerDay:  { type: Number, min: 1,   max: 8    },                  // NEW (integer in validator)
    waterTarget:  { type: Number, min: 0.5, max: 10   },                  // NEW
    cheatMeals:   { type: Number, min: 0,   max: 7    },                  // NEW (integer in validator)
    foodDislikes: { type: String, trim: true, maxlength: 1000 },          // NEW
    eatingHabits: { type: String, trim: true, maxlength: 2000 },          // NEW

    // ── Trainer-private notes ────────────────────────────────
    privateNotes: { type: String, trim: true, maxlength: 4000 },          // NEW (mapped from wizard `notes`)

    // ── Lifecycle ────────────────────────────────────────────
    status: { type: String, enum: CLIENT_STATUSES, default: "ACTIVE" },

    // ── Account linking ──────────────────────────────────────
    // The profile is the source of truth. When the client signs in with
    // Google (possibly under a DIFFERENT email than they were invited with),
    // that Google User is attached here. Relationships are always keyed by
    // userId — never by email.
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    googleLinked: { type: Boolean, default: false },
    // The email of the Google account that was linked (for the trainer's
    // reference / mismatch audit). Distinct from `email`, the invited address.
    googleEmail:  { type: String, lowercase: true, trim: true },

    // Timestamp of the most recent successful WhatsApp activation invite.
    // Drives the "Invite Sent: <date>" display in the client overview.
    lastInviteSentAt: { type: Date },
  },
  { timestamps: true }
);

clientSchema.index({ trainerId: 1 });
clientSchema.index({ trainerId: 1, status: 1 });

const Client = mongoose.model("Client", clientSchema);

module.exports = { Client, CLIENT_STATUSES, GENDER_OPTIONS };
