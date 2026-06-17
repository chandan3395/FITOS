"use strict";

/**
 * Pure, framework-agnostic helpers for in-app messaging.
 *
 * The tick lifecycle (sent → delivered → read), per-participant unread
 * bookkeeping, role resolution and the denormalized last-message preview all
 * live here as plain functions so they can be unit-tested without Mongo or
 * Socket.IO. The service layer orchestrates the DB; these helpers decide the
 * arithmetic and the state transitions.
 *
 * A Conversation has exactly two participants identified by ROLE — "trainer"
 * and "client". Unread counts are tracked per role: { trainer, client }.
 */

const TRAINER = "trainer";
const CLIENT = "client";
const PARTICIPANT_ROLES = [TRAINER, CLIENT];

// Forward-only status lifecycle. A status may only advance along this order;
// it never moves backwards (a "read" message can't regress to "delivered").
const MESSAGE_STATUSES = ["sent", "delivered", "read"];
const STATUS_RANK = MESSAGE_STATUSES.reduce((acc, s, i) => {
  acc[s] = i;
  return acc;
}, {});

const MAX_BODY_LENGTH = 5000;

/** The other participant's role. */
function otherRole(role) {
  return role === TRAINER ? CLIENT : TRAINER;
}

/** The role that should RECEIVE a message sent by `senderRole`. */
function recipientRoleOf(senderRole) {
  return otherRole(senderRole);
}

function isParticipantRole(role) {
  return role === TRAINER || role === CLIENT;
}

/** A fresh zeroed unread map. */
function emptyUnread() {
  return { trainer: 0, client: 0 };
}

/** Read a participant's unread count off a conversation (0 when absent). */
function unreadCountFor(conversation, role) {
  const unread = (conversation && conversation.unread) || {};
  return Number(unread[role]) || 0;
}

/**
 * Whether a status transition is allowed: strictly forward along the
 * sent → delivered → read order. Equal or backwards transitions are no-ops
 * (return false) so callers can skip a redundant DB write / emit.
 */
function canAdvanceStatus(current, target) {
  const from = STATUS_RANK[current];
  const to = STATUS_RANK[target];
  if (from === undefined || to === undefined) return false;
  return to > from;
}

/**
 * Validate + normalize an outgoing message body. Returns the trimmed string.
 * Throws a plain Error (the service maps it to an ApiError / socket ack) when
 * empty or over the max length.
 */
function normalizeBody(raw) {
  const body = typeof raw === "string" ? raw.trim() : "";
  if (!body) {
    const err = new Error("Message body is required");
    err.code = "EMPTY_BODY";
    throw err;
  }
  if (body.length > MAX_BODY_LENGTH) {
    const err = new Error(`Message body exceeds ${MAX_BODY_LENGTH} characters`);
    err.code = "BODY_TOO_LONG";
    throw err;
  }
  return body;
}

/** Build the denormalized last-message preview stored on the conversation. */
function buildPreview(message) {
  if (!message) return undefined;
  return {
    body: message.body,
    senderId: message.senderId,
    senderRole: message.senderRole,
    createdAt: message.createdAt || new Date(),
  };
}

/**
 * Given a message about to be persisted, decide the resulting unread map for
 * the conversation: the RECIPIENT's count goes up by one, the sender's is
 * unchanged. Returns a NEW object (does not mutate the input).
 */
function applyIncomingToUnread(unread, senderRole) {
  const base = { trainer: 0, client: 0, ...(unread || {}) };
  const recipient = recipientRoleOf(senderRole);
  return {
    ...base,
    [recipient]: (Number(base[recipient]) || 0) + 1,
  };
}

/** Zero a single participant's unread count (returns a NEW object). */
function clearUnreadFor(unread, role) {
  return { trainer: 0, client: 0, ...(unread || {}), [role]: 0 };
}

module.exports = {
  TRAINER,
  CLIENT,
  PARTICIPANT_ROLES,
  MESSAGE_STATUSES,
  STATUS_RANK,
  MAX_BODY_LENGTH,
  otherRole,
  recipientRoleOf,
  isParticipantRole,
  emptyUnread,
  unreadCountFor,
  canAdvanceStatus,
  normalizeBody,
  buildPreview,
  applyIncomingToUnread,
  clearUnreadFor,
};
