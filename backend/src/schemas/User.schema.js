"use strict";

const mongoose = require("mongoose");

const ROLES = ["ADMIN", "TRAINER", "CLIENT"];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      enum: ROLES,
      required: true,
    },
    googleId: {
      type: String,
      sparse: true,
    },
    // True when the account was created via Google or has since linked a
    // Google identity. Trainers/clients may still set a password and use
    // email+password login in addition to Google.
    googleLinked: {
      type: Boolean,
      default: false,
    },
    profileImage: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    refreshToken: {
      type: String,
      default: null,
      select: false,
    },

    // ── Demo environment ─────────────────────────────────────
    // Marks the permanent demo accounts (demo.trainer@ / demo.client@).
    // `isDemoAccount` lets the seed script find/repair them idempotently and
    // scope every destructive action to demo-only data. `isProtected` is the
    // safety latch: protected accounts cannot be disabled (admin service) or
    // their linked client deleted (client service). Both default false so all
    // existing users are unaffected.
    isDemoAccount: {
      type: Boolean,
      default: false,
    },
    isProtected: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = { User, ROLES };
