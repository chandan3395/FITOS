"use strict";

/**
 * Socket.IO emit surface — holds the io singleton and the low-level room
 * emitters. Kept dependency-free (io only, no DB) so both the REST controllers
 * and the socket handlers can emit through one place. Every emitter is a no-op
 * until `setIO` is called (e.g. in unit tests where no server is attached),
 * so callers never need to guard.
 */

let io = null;

function setIO(instance) {
  io = instance;
}

function getIO() {
  return io;
}

const convRoom = (id) => `conversation:${id}`;
const userRoom = (id) => `user:${id}`;

/**
 * Emit a newly-persisted message to its conversation room. The recipient's
 * sockets are force-joined to the room first so a BRAND-NEW conversation
 * (whose room didn't exist when the recipient connected) still reaches them.
 */
function emitMessageToConversation({ conversation, message, recipientUserId }) {
  if (!io) return;
  const room = convRoom(conversation._id);
  if (recipientUserId) io.in(userRoom(recipientUserId)).socketsJoin(room);
  io.to(room).emit("message:new", { conversationId: conversation._id, message });
}

function emitDeliveredReceipt(conversationId, { messageIds, deliveredAt }) {
  if (!io || !messageIds || !messageIds.length) return;
  io.to(convRoom(conversationId)).emit("message:delivered", {
    conversationId,
    messageIds,
    deliveredAt,
  });
}

function emitReadReceipt(conversationId, { messageIds, readerRole, readAt }) {
  if (!io || !messageIds || !messageIds.length) return;
  io.to(convRoom(conversationId)).emit("message:read", {
    conversationId,
    messageIds,
    readerRole,
    readAt,
  });
}

/** Ephemeral typing indicator — broadcast to the room EXCEPT the sender. */
function emitTyping(senderSocket, conversationId, role, typing) {
  if (!io) return;
  senderSocket.to(convRoom(conversationId)).emit("typing", { conversationId, role, typing });
}

/** Presence change — broadcast to the given conversation rooms. */
function emitPresence(rooms, payload) {
  if (!io) return;
  rooms.forEach((room) => io.to(room).emit("presence:update", payload));
}

module.exports = {
  setIO,
  getIO,
  convRoom,
  userRoom,
  emitMessageToConversation,
  emitDeliveredReceipt,
  emitReadReceipt,
  emitTyping,
  emitPresence,
};
