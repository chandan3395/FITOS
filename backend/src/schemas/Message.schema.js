"use strict";

const mongoose = require("mongoose");
const { MESSAGE_STATUSES, MAX_BODY_LENGTH } = require("../utils/messaging");

/**
 * Message — one chat message inside a Conversation.
 *
 * Mongo is the source of truth; sockets are delivery only. Every message is
 * persisted with status "sent" BEFORE it is emitted, and the tick lifecycle
 * (sent → delivered → read) is reconciled on the document so a reconnecting
 * client re-reading history sees the correct state regardless of which emits
 * it missed while offline.
 */
const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    // The sender's User id, plus their role within the conversation so reads
    // never need to re-derive who is the trainer vs the client.
    senderId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: ["trainer", "client"], required: true },

    body: { type: String, required: true, trim: true, maxlength: MAX_BODY_LENGTH },

    status:      { type: String, enum: MESSAGE_STATUSES, default: "sent" },
    deliveredAt: { type: Date },
    readAt:      { type: Date },
  },
  { timestamps: true }
);

// Paginated history — newest-last per conversation.
messageSchema.index({ conversationId: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);

module.exports = { Message };
