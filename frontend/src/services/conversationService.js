import api from "../lib/api";

/**
 * Messaging REST client — wraps /api/conversations.
 *
 * Sending/receiving is primarily over the socket (see SocketContext); these
 * REST calls cover resolve/history/read and a send FALLBACK that shares the
 * same backend persist-then-emit path when the socket isn't connected.
 */

/** GET /conversations — the signed-in user's conversation list (newest first). */
async function list() {
  const res = await api.get("/conversations");
  return res.data?.data?.conversations ?? [];
}

/**
 * GET /conversations/resolve — resolve/open the conversation for a pair WITHOUT
 * materializing it. Trainer passes clientId; client omits it (uses self).
 * Returns the conversation descriptor: { started, conversationId, clientId,
 * trainerId, lastMessage, lastActivityAt, unread, otherParticipant }.
 * `started === false` is the "not started yet" signal the empty state branches on.
 */
async function resolve(clientId) {
  const res = await api.get("/conversations/resolve", {
    params: clientId ? { clientId } : {},
  });
  return res.data?.data?.conversation ?? null;
}

/**
 * GET /conversations/:id/messages — paginated history, newest-LAST.
 * Pass `before` (an ISO date cursor) to page backwards into older messages.
 * Returns { conversationId, messages, hasMore, nextBefore }.
 */
async function history(conversationId, { before, limit } = {}) {
  const res = await api.get(`/conversations/${conversationId}/messages`, {
    params: { before, limit },
  });
  return res.data?.data ?? { messages: [], hasMore: false, nextBefore: null };
}

/** POST /conversations/:id/read — zero the caller's unread + mark incoming read. */
async function markRead(conversationId) {
  const res = await api.post(`/conversations/${conversationId}/read`);
  return res.data?.data ?? null;
}

/**
 * POST /conversations/send — REST send fallback (resilience). Body { clientId?, body }.
 * Clients omit clientId (resolved server-side). Returns { conversationId, message }.
 */
async function send({ clientId, body }) {
  const res = await api.post("/conversations/send", { clientId, body });
  return res.data?.data ?? null;
}

const conversationService = { list, resolve, history, markRead, send };
export default conversationService;
