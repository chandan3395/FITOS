"use strict";

const mongoose = require("mongoose");

const clientInviteSchema = new mongoose.Schema(
  {
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Authoritative link to the invited Client record. Activation resolves
    // the client by this id; matching on clientName is ambiguous when one
    // trainer has two clients with the same name. Optional so legacy invites
    // created before this field continue to load (they fall back to name).
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
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
