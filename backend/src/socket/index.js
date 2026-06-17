"use strict";

const { Server } = require("socket.io");
const { env } = require("../config/env");
const logger = require("../config/logger");
const { authenticateSocket } = require("./auth");
const presence = require("./presence");
const emit = require("./emit");
const dispatch = require("./dispatch");
const conversationService = require("../services/conversation.service");
const { viewerRoleOf } = require("../services/conversation.service");

// A typing indicator the client forgot to stop auto-expires after this long.
const TYPING_TIMEOUT_MS = 3000;

function ackOk(ack, data) {
  if (typeof ack === "function") ack({ ok: true, ...data });
}
function ackErr(ack, e) {
  if (typeof ack === "function") ack({ ok: false, error: e.message, status: e.statusCode || 500 });
}

/**
 * Attach the Socket.IO server to the existing HTTP server.
 *
 * Mongo is the source of truth; this layer is delivery only:
 *   - handshake authenticated with the same JWT as REST,
 *   - on connect: mark online, join a room per participating conversation,
 *     flush undelivered messages to "delivered",
 *   - message:send persists via the SAME service path as REST then emits,
 *   - read receipts / typing / presence broadcast to the other participant.
 */
function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_ORIGIN, credentials: true },
  });

  emit.setIO(io);
  io.use(authenticateSocket);

  io.on("connection", async (socket) => {
    const user = socket.user;
    const role = viewerRoleOf(user);
    const userIdStr = String(user._id);

    // Per-socket typing timers, keyed by conversationId.
    const typingTimers = new Map();
    const clearTypingTimer = (cid) => {
      const t = typingTimers.get(cid);
      if (t) {
        clearTimeout(t);
        typingTimers.delete(cid);
      }
    };

    try {
      // Join a personal room (lets us pull this user's sockets into a brand-new
      // conversation room later) + a room per existing conversation.
      socket.join(emit.userRoom(userIdStr));
      const convIds = await conversationService.listConversationIdsForUser(user);
      const convRooms = convIds.map((id) => emit.convRoom(id));
      convRooms.forEach((r) => socket.join(r));

      // Mark online; announce only on the transition offline → online.
      const cameOnline = presence.addConnection(user._id, socket.id);
      if (cameOnline) {
        emit.emitPresence(convRooms, { userId: userIdStr, online: true, lastSeenAt: null });
      }

      // Flush any messages that were "sent" while this user was offline.
      const flushed = await conversationService.flushDeliveriesOnConnect(user);
      flushed.forEach(({ conversationId, messageIds, deliveredAt }) =>
        emit.emitDeliveredReceipt(conversationId, { messageIds, deliveredAt })
      );
    } catch (err) {
      logger.error("[socket] connection setup failed", err?.message);
    }

    // ── send ────────────────────────────────────────────────────────────
    socket.on("message:send", async (payload, ack) => {
      try {
        const result = await conversationService.sendMessage(user, {
          clientId: payload?.clientId,
          body: payload?.body,
        });
        // Ensure the sender is in the (possibly brand-new) conversation room.
        socket.join(emit.convRoom(result.conversation._id));
        await dispatch.deliverNewMessage(result);
        ackOk(ack, { conversationId: result.conversation._id, message: result.message });
      } catch (e) {
        ackErr(ack, e);
      }
    });

    // ── read receipt ──────────────────────────────────────────────────────
    socket.on("conversation:read", async (payload, ack) => {
      try {
        const result = await conversationService.markRead(user, payload?.conversationId);
        dispatch.emitRead(result.conversation._id, {
          messageIds: result.messageIds,
          readerRole: result.readerRole,
          readAt: result.readAt,
        });
        ackOk(ack, { conversationId: result.conversation._id, readMessageIds: result.messageIds });
      } catch (e) {
        ackErr(ack, e);
      }
    });

    // ── typing (ephemeral, not persisted) ─────────────────────────────────
    socket.on("typing:start", (payload) => {
      const cid = payload?.conversationId;
      // Only broadcast into rooms this socket actually belongs to (no spoofing).
      if (!cid || !socket.rooms.has(emit.convRoom(cid))) return;
      emit.emitTyping(socket, cid, role, true);
      clearTypingTimer(cid);
      typingTimers.set(
        cid,
        setTimeout(() => {
          emit.emitTyping(socket, cid, role, false);
          typingTimers.delete(cid);
        }, TYPING_TIMEOUT_MS)
      );
    });

    socket.on("typing:stop", (payload) => {
      const cid = payload?.conversationId;
      if (!cid || !socket.rooms.has(emit.convRoom(cid))) return;
      clearTypingTimer(cid);
      emit.emitTyping(socket, cid, role, false);
    });

    // ── disconnect ─────────────────────────────────────────────────────────
    // 'disconnecting' fires while socket.rooms is still populated, so we can
    // address the conversation rooms before they're torn down.
    socket.on("disconnecting", async () => {
      const convRooms = [...socket.rooms].filter((r) => r.startsWith("conversation:"));
      typingTimers.forEach((t) => clearTimeout(t));
      typingTimers.clear();

      const nowOffline = presence.removeConnection(user._id, socket.id);
      if (nowOffline) {
        let when = new Date();
        try {
          when = await conversationService.recordLastSeen(user._id);
        } catch (err) {
          logger.error("[socket] recordLastSeen failed", err?.message);
        }
        emit.emitPresence(convRooms, { userId: userIdStr, online: false, lastSeenAt: when });
      }
    });
  });

  logger.info("Socket.IO attached");
  return io;
}

module.exports = { initSocket };
