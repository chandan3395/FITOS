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
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = { User, ROLES };
