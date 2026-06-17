"use strict";

const mongoose = require("mongoose");

/**
 * Conversation — exactly one per trainer↔client pair.
 *
 * MATERIALIZED on the first message (never pre-created for every assignment):
 * the resolve endpoint returns a "not started" signal until then. Ownership is
 * derived from the assignment, NOT stored as a separate participant list — a
 * user participates iff they are this `trainerId` (a User) or own this
 * `clientId` (the Client profile, whose `userId` is the signed-in client).
 *
 * `lastMessage` + `lastActivityAt` are denormalized so the conversation list
 * renders without a per-row message query. `unread` holds per-participant
 * counts keyed by ROLE so the list reads them directly (no count-at-query).
 */

// Denormalized preview of the most recent message, for the list view.
const lastMessageSchema = new mongoose.Schema(
  {
    body:       { type: String },
    senderId:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    senderRole: { type: String, enum: ["trainer", "client"] },
    createdAt:  { type: Date },
  },
  { _id: false }
);

// Per-participant unread counts, keyed by role.
const unreadSchema = new mongoose.Schema(
  {
    trainer: { type: Number, min: 0, default: 0 },
    client:  { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    // The trainer's User id (Client.trainerId references a User).
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // The Client PROFILE id (consistent with the rest of the API surface,
    // where ":clientId" is always a Client._id, not the client's User id).
    clientId:  { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },

    lastMessage:    { type: lastMessageSchema, default: undefined },
    lastActivityAt: { type: Date, default: Date.now },

    unread: { type: unreadSchema, default: () => ({ trainer: 0, client: 0 }) },
  },
  { timestamps: true }
);

// Exactly one conversation per pair.
conversationSchema.index({ trainerId: 1, clientId: 1 }, { unique: true });
// Trainer's list — newest activity first.
conversationSchema.index({ trainerId: 1, lastActivityAt: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = { Conversation };
