"use strict";

const conversationService = require("../services/conversation.service");
const ApiResponse = require("../utils/ApiResponse");
const dispatch = require("../socket/dispatch");

/** GET /api/conversations — the signed-in user's conversation list. */
async function list(req, res, next) {
  try {
    const conversations = await conversationService.listConversations(req.user);
    return ApiResponse.ok(res, "Conversations fetched", { conversations });
  } catch (e) { next(e); }
}

/**
 * GET /api/conversations/resolve — resolve/open the conversation for a pair
 * without materializing it. Trainer passes ?clientId=...; client uses self.
 * Returns `started: false` until the first message exists.
 */
async function resolve(req, res, next) {
  try {
    const result = await conversationService.openConversation(req.user, { clientId: req.query.clientId });
    return ApiResponse.ok(res, "Conversation resolved", { conversation: result });
  } catch (e) { next(e); }
}

/** GET /api/conversations/:id/messages — paginated history (newest-last). */
async function history(req, res, next) {
  try {
    const result = await conversationService.getHistory(req.user, req.params.id, {
      before: req.query.before,
      limit: req.query.limit,
    });
    return ApiResponse.ok(res, "Messages fetched", result);
  } catch (e) { next(e); }
}

/**
 * POST /api/conversations/:id/read — mark the caller's incoming messages read,
 * zero their unread, and (if sockets are live) emit a read receipt to the
 * other participant.
 */
async function markRead(req, res, next) {
  try {
    const result = await conversationService.markRead(req.user, req.params.id);
    dispatch.emitRead(result.conversation._id, {
      messageIds: result.messageIds,
      readerRole: result.readerRole,
      readAt: result.readAt,
    });
    return ApiResponse.ok(res, "Conversation marked read", {
      conversationId: result.conversation._id,
      unread: 0,
      readMessageIds: result.messageIds,
    });
  } catch (e) { next(e); }
}

/**
 * POST /api/conversations/send — REST send fallback (resilience). Shares the
 * EXACT persist-then-emit + ownership path the socket handler uses, so a
 * message sent over HTTP still lands in the conversation room in real time.
 * Body: { clientId?, body }. (clientId required for trainers; clients use self.)
 */
async function send(req, res, next) {
  try {
    const result = await conversationService.sendMessage(req.user, {
      clientId: req.body.clientId,
      body: req.body.body,
    });
    await dispatch.deliverNewMessage(result);
    return ApiResponse.created(res, "Message sent", {
      conversationId: result.conversation._id,
      message: result.message,
    });
  } catch (e) { next(e); }
}

module.exports = { list, resolve, history, markRead, send };
