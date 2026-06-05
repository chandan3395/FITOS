"use strict";

const mongoose = require("mongoose");

const clientInviteSchema = new mongoose.Schema(
  {
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    // Cryptographically random token — used in the invite link
    inviteToken: {
      type: String,
      required: true,
      unique: true, // automatically creates an index
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// "List all pending invites sent by trainer X"
clientInviteSchema.index({ trainerId: 1, isUsed: 1 });

// Fast token lookup during invite activation
clientInviteSchema.index({ inviteToken: 1, expiresAt: 1 });

const ClientInvite = mongoose.model("ClientInvite", clientInviteSchema);

module.exports = { ClientInvite };
