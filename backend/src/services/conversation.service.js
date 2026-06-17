"use strict";

const mongoose = require("mongoose");
const { Conversation } = require("../schemas/Conversation.schema");
const { Message } = require("../schemas/Message.schema");
const { User } = require("../schemas/User.schema");
const ApiError = require("../utils/ApiError");
const presence = require("../socket/presence");
const {
  resolveClientForUser,
  resolveCurrentClient,
} = require("../utils/clientAccess");
const {
  TRAINER,
  CLIENT,
  otherRole,
  recipientRoleOf,
  unreadCountFor,
  normalizeBody,
  buildPreview,
  applyIncomingToUnread,
  clearUnreadFor,
} = require("../utils/messaging");

const HISTORY_DEFAULT_LIMIT = 30;
const HISTORY_MAX_LIMIT = 100;

// ── ownership / resolution ────────────────────────────────────────────────

/**
 * Resolve the trainer↔client pair for the signed-in user and authorize it.
 *   - TRAINER: must OWN the passed clientId (enforced by resolveClientForUser).
 *   - CLIENT:  uses their own profile; the trainerId comes from the assignment.
 * Admin (or any other role) is never a participant → 403.
 * @returns {Promise<{ trainerId, client }>}
 */
async function resolveOwnership(user, { clientId } = {}) {
  if (user.role === "TRAINER") {
    const client = await resolveClientForUser(user, clientId, { excludeDeleted: true });
    return { trainerId: user._id, client };
  }
  if (user.role === "CLIENT") {
    const client = await resolveCurrentClient(user, { excludeDeleted: true });
    return { trainerId: client.trainerId, client };
  }
  throw new ApiError(403, "Forbidden");
}

/** The signed-in user's role WITHIN a conversation. */
function viewerRoleOf(user) {
  return user.role === "TRAINER" ? TRAINER : CLIENT;
}

async function loadConversation(conversationId) {
  if (!mongoose.isValidObjectId(conversationId)) {
    throw new ApiError(400, "Invalid conversation id");
  }
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new ApiError(404, "Conversation not found");
  return conversation;
}

/**
 * Assert the user participates in this conversation and return their role.
 * Ownership derives from the assignment, never a stored participant list.
 */
async function assertParticipant(user, conversation) {
  if (!conversation) throw new ApiError(404, "Conversation not found");
  if (user.role === "TRAINER") {
    if (String(conversation.trainerId) === String(user._id)) return TRAINER;
    throw new ApiError(403, "Forbidden");
  }
  if (user.role === "CLIENT") {
    const client = await resolveCurrentClient(user, { excludeDeleted: true });
    if (String(conversation.clientId) === String(client._id)) return CLIENT;
    throw new ApiError(403, "Forbidden");
  }
  throw new ApiError(403, "Forbidden");
}

// ── presence helpers ──────────────────────────────────────────────────────

async function fetchLastSeen(userIds) {
  const ids = userIds.filter(Boolean).map(String);
  if (!ids.length) return {};
  const users = await User.find({ _id: { $in: ids } }, "lastSeenAt").lean();
  const map = {};
  users.forEach((u) => {
    map[String(u._id)] = u.lastSeenAt || null;
  });
  return map;
}

function presenceFor(otherUserId, otherName, viewerRole, lastSeenMap) {
  return {
    userId: otherUserId || null,
    name: otherName || null,
    role: otherRole(viewerRole),
    online: otherUserId ? presence.isOnline(otherUserId) : false,
    lastSeenAt: otherUserId ? lastSeenMap[String(otherUserId)] || null : null,
  };
}

// `clientId`/`trainerId` may be a raw ObjectId or a populated doc — normalize.
const idOf = (ref) => (ref && ref._id ? ref._id : ref);

function buildRow({ conversation, viewerRole, otherUserId, otherName, lastSeenMap }) {
  return {
    conversationId: conversation._id,
    clientId: idOf(conversation.clientId),
    trainerId: idOf(conversation.trainerId),
    lastMessage: conversation.lastMessage || null,
    lastActivityAt: conversation.lastActivityAt,
    unread: unreadCountFor(conversation, viewerRole),
    otherParticipant: presenceFor(otherUserId, otherName, viewerRole, lastSeenMap),
  };
}

// ── reads ───────────────────────────────────────────────────────────────

/**
 * GET conversations for the signed-in user, newest-activity first.
 *   - TRAINER: every conversation they've started, with the client as the
 *     other participant + that client's presence/last-seen.
 *   - CLIENT:  their single conversation (or [] if not started), with the
 *     trainer as the other participant.
 * Unread is the VIEWER's own per-participant count (read straight off the doc).
 */
async function listConversations(user) {
  if (user.role === "TRAINER") {
    const convos = await Conversation.find({ trainerId: user._id })
      .populate("clientId", "name userId")
      .sort({ lastActivityAt: -1 })
      .lean();
    const otherIds = convos.map((c) => c.clientId && c.clientId.userId).filter(Boolean);
    const lastSeenMap = await fetchLastSeen(otherIds);
    return convos.map((c) =>
      buildRow({
        conversation: c,
        viewerRole: TRAINER,
        otherUserId: c.clientId && c.clientId.userId,
        otherName: c.clientId && c.clientId.name,
        lastSeenMap,
      })
    );
  }
  if (user.role === "CLIENT") {
    const client = await resolveCurrentClient(user, { excludeDeleted: true });
    const convo = await Conversation.findOne({ trainerId: client.trainerId, clientId: client._id })
      .populate("trainerId", "name")
      .lean();
    if (!convo) return [];
    const otherUserId = idOf(convo.trainerId);
    const lastSeenMap = await fetchLastSeen([otherUserId]);
    return [
      buildRow({
        conversation: convo,
        viewerRole: CLIENT,
        otherUserId,
        otherName: convo.trainerId && convo.trainerId.name,
        lastSeenMap,
      }),
    ];
  }
  throw new ApiError(403, "Forbidden");
}

/**
 * Resolve/open the conversation for a specific pair WITHOUT materializing it.
 * Returns `started: false` (and a null conversationId) until the first message
 * exists, so the frontend can render the "Start the conversation" empty state.
 */
async function openConversation(user, { clientId } = {}) {
  const { trainerId, client } = await resolveOwnership(user, { clientId });
  const viewerRole = viewerRoleOf(user);
  const conversation = await Conversation.findOne({ trainerId, clientId: client._id }).lean();

  let otherUserId;
  let otherName;
  if (viewerRole === TRAINER) {
    otherUserId = client.userId;
    otherName = client.name;
  } else {
    const trainer = await User.findById(trainerId, "name").lean();
    otherUserId = trainerId;
    otherName = trainer && trainer.name;
  }
  const lastSeenMap = await fetchLastSeen([otherUserId]);

  return {
    started: Boolean(conversation),
    conversationId: conversation ? conversation._id : null,
    clientId: client._id,
    trainerId,
    lastMessage: conversation ? conversation.lastMessage || null : null,
    lastActivityAt: conversation ? conversation.lastActivityAt : null,
    unread: conversation ? unreadCountFor(conversation, viewerRole) : 0,
    otherParticipant: presenceFor(otherUserId, otherName, viewerRole, lastSeenMap),
  };
}

/**
 * Paginated message history, ownership-checked, returned newest-LAST.
 * Cursor: pass `before` (an ISO date / message createdAt) to page backwards
 * into older messages. `hasMore` + `nextBefore` drive "load older".
 */
async function getHistory(user, conversationId, { before, limit } = {}) {
  const conversation = await loadConversation(conversationId);
  await assertParticipant(user, conversation);

  const cap = Math.max(1, Math.min(Number(limit) || HISTORY_DEFAULT_LIMIT, HISTORY_MAX_LIMIT));
  const query = { conversationId: conversation._id };
  if (before) {
    const beforeDate = new Date(before);
    if (!Number.isNaN(beforeDate.getTime())) query.createdAt = { $lt: beforeDate };
  }

  // Fetch the newest `cap` matching (descending), peeking one extra to know if
  // there are older messages, then reverse to chronological order.
  const docs = await Message.find(query).sort({ createdAt: -1 }).limit(cap + 1).lean();
  const hasMore = docs.length > cap;
  const page = (hasMore ? docs.slice(0, cap) : docs).reverse();
  const nextBefore = hasMore && page.length ? page[0].createdAt : null;

  return { conversationId: conversation._id, messages: page, hasMore, nextBefore };
}

// ── writes (shared persist-then-emit path) ─────────────────────────────────

function cleanBodyOrThrow(body) {
  try {
    return normalizeBody(body);
  } catch (e) {
    if (e.code === "EMPTY_BODY" || e.code === "BODY_TOO_LONG") {
      throw new ApiError(400, e.message);
    }
    throw e;
  }
}

/**
 * Persist a message (status "sent") and update the conversation preview +
 * recipient unread. MATERIALIZES the conversation on first message. This is
 * the single source of truth shared by the socket `message:send` handler and
 * the REST POST send fallback — both ownership-check via resolveOwnership.
 *
 * Returns everything the caller needs to emit: the message, the (updated)
 * conversation, and the recipient's role + User id (for presence/delivery).
 */
async function sendMessage(user, { clientId, body } = {}) {
  const { trainerId, client } = await resolveOwnership(user, { clientId });
  const senderRole = viewerRoleOf(user);
  const cleanBody = cleanBodyOrThrow(body);

  let conversation = await Conversation.findOne({ trainerId, clientId: client._id });
  if (!conversation) {
    conversation = await Conversation.create({
      trainerId,
      clientId: client._id,
      lastActivityAt: new Date(),
    });
  }

  const message = await Message.create({
    conversationId: conversation._id,
    senderId: user._id,
    senderRole,
    body: cleanBody,
    status: "sent",
  });

  conversation.lastMessage = buildPreview(message);
  conversation.lastActivityAt = message.createdAt;
  conversation.unread = applyIncomingToUnread(conversation.unread, senderRole);
  await conversation.save();

  const recipientRole = recipientRoleOf(senderRole);
  const recipientUserId = recipientRole === TRAINER ? trainerId : client.userId;

  return { conversation, message, senderRole, recipientRole, recipientUserId, client };
}

/**
 * Mark the caller's incoming unread messages READ: flip status → "read"
 * (set readAt) for every not-yet-read message FROM the other participant, and
 * zero the caller's unread count. Returns the read message ids + reader role
 * so the socket layer can emit a read receipt to the other side.
 */
async function markRead(user, conversationId) {
  const conversation = await loadConversation(conversationId);
  const role = await assertParticipant(user, conversation);
  const incomingRole = otherRole(role);
  const readAt = new Date();

  const pending = await Message.find(
    { conversationId: conversation._id, senderRole: incomingRole, status: { $ne: "read" } },
    "_id"
  ).lean();
  const messageIds = pending.map((m) => m._id);

  if (messageIds.length) {
    await Message.updateMany(
      { _id: { $in: messageIds } },
      { $set: { status: "read", readAt } }
    );
  }

  conversation.unread = clearUnreadFor(conversation.unread, role);
  await conversation.save();

  return { conversation, readerRole: role, incomingRole, readAt, messageIds };
}

/**
 * Mark incoming "sent" messages for one conversation as "delivered" (set
 * deliveredAt). `recipientRole` is the side that just came online / received.
 * Pure-forward: already-delivered/read messages are untouched.
 */
async function markDelivered(conversationId, recipientRole) {
  const incomingRole = otherRole(recipientRole);
  const deliveredAt = new Date();

  const pending = await Message.find(
    { conversationId, senderRole: incomingRole, status: "sent" },
    "_id"
  ).lean();
  const messageIds = pending.map((m) => m._id);

  if (messageIds.length) {
    await Message.updateMany(
      { _id: { $in: messageIds } },
      { $set: { status: "delivered", deliveredAt } }
    );
  }

  return { messageIds, deliveredAt };
}

/** Lightweight `{_id}` list of the conversations a user participates in. */
async function listParticipantConversationDocs(user) {
  if (user.role === "TRAINER") {
    return Conversation.find({ trainerId: user._id }).select("_id").lean();
  }
  if (user.role === "CLIENT") {
    const client = await resolveCurrentClient(user, { excludeDeleted: true }).catch(() => null);
    if (!client) return [];
    const convo = await Conversation.findOne({ trainerId: client.trainerId, clientId: client._id })
      .select("_id")
      .lean();
    return convo ? [convo] : [];
  }
  return [];
}

/** Conversation ids the user should join rooms for on (re)connect. */
async function listConversationIdsForUser(user) {
  const docs = await listParticipantConversationDocs(user);
  return docs.map((d) => d._id);
}

/**
 * On (re)connect: flush every "sent" incoming message across the user's
 * conversations to "delivered". Returns one entry per conversation that had
 * pending deliveries so the socket layer can emit delivered receipts.
 */
async function flushDeliveriesOnConnect(user) {
  const docs = await listParticipantConversationDocs(user);
  const role = viewerRoleOf(user);
  const out = [];
  for (const doc of docs) {
    const { messageIds, deliveredAt } = await markDelivered(doc._id, role);
    if (messageIds.length) {
      out.push({ conversationId: doc._id, messageIds, deliveredAt });
    }
  }
  return out;
}

/** Persist a user's last-seen timestamp (called on full disconnect). */
async function recordLastSeen(userId, when = new Date()) {
  await User.findByIdAndUpdate(userId, { lastSeenAt: when });
  return when;
}

module.exports = {
  resolveOwnership,
  assertParticipant,
  loadConversation,
  listConversations,
  openConversation,
  getHistory,
  sendMessage,
  markRead,
  markDelivered,
  listConversationIdsForUser,
  listParticipantConversationDocs,
  flushDeliveriesOnConnect,
  recordLastSeen,
  viewerRoleOf,
};
