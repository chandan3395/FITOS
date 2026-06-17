import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import conversationService from "../services/conversationService";

/**
 * Drives one trainer↔client message thread end-to-end, shared by the trainer
 * client-profile tab (pass clientId) and the client portal tab (omit clientId →
 * self). Encapsulates: resolve (+ "not started" signal), paginated history,
 * live send/receive over the shared socket with a REST fallback, mark-read,
 * delivered/read tick reconciliation, presence (online/last-seen), typing
 * indicators, and reconnect reconciliation. Mongo is the source of truth, so
 * messages are de-duplicated by _id (the socket echoes the sender's own message
 * back to the room) and history is re-fetched on reconnect to heal misses.
 */

const byCreatedAt = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);

// Tick lifecycle is forward-only (sent → delivered → read). The backend emits
// the delivered receipt BEFORE the send ack resolves, so a naive merge of the
// ack (status "sent") would regress an already-"delivered" bubble — pick the
// most-advanced status whenever two views of the same message are merged.
const STATUS_RANK = { sent: 0, delivered: 1, read: 2 };
const maxStatus = (a, b) =>
  (STATUS_RANK[b] ?? -1) > (STATUS_RANK[a] ?? -1) ? b : a;

// Insert-or-update a message by _id, keeping the list in chronological order
// and never regressing its tick status.
function upsertMessage(list, msg) {
  const idx = list.findIndex((m) => String(m._id) === String(msg._id));
  if (idx >= 0) {
    const next = list.slice();
    const existing = next[idx];
    next[idx] = { ...existing, ...msg, status: maxStatus(existing.status, msg.status) };
    return next;
  }
  return [...list, msg].sort(byCreatedAt);
}

// Other party's typing auto-clears if a stop/expire event is ever missed.
const TYPING_CLEAR_MS = 4000;

export default function useMessageThread({ clientId } = {}) {
  const { user } = useAuthContext();
  const { socket, connected } = useSocket();

  const myRole = user?.role === "TRAINER" ? "trainer" : "client";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [started, setStarted] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [otherParticipant, setOtherParticipant] = useState(null);
  const [presence, setPresence] = useState({ online: false, lastSeenAt: null });
  const [otherTyping, setOtherTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState(null);
  const [sending, setSending] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);

  // Refs so the long-lived socket handlers always see current values without
  // needing to re-subscribe on every state change.
  const conversationIdRef = useRef(null);
  const otherUserIdRef = useRef(null);
  const mountedRef = useRef(true);
  const didInitialLoadRef = useRef(false);
  const typingClearTimer = useRef(null);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const markReadSafe = useCallback((cid) => {
    const id = cid || conversationIdRef.current;
    if (!id) return;
    conversationService.markRead(id).catch(() => {});
  }, []);

  // Resolve the conversation and, if started, load the latest history page.
  // `silent` skips the full-screen spinner for reconnect reconciliation.
  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const resolved = await conversationService.resolve(clientId);
        if (!mountedRef.current) return;

        setStarted(Boolean(resolved?.started));
        setOtherParticipant(resolved?.otherParticipant ?? null);
        otherUserIdRef.current = resolved?.otherParticipant?.userId
          ? String(resolved.otherParticipant.userId)
          : null;
        setPresence({
          online: Boolean(resolved?.otherParticipant?.online),
          lastSeenAt: resolved?.otherParticipant?.lastSeenAt ?? null,
        });

        const cid = resolved?.conversationId ?? null;
        setConversationId(cid);
        conversationIdRef.current = cid;

        if (cid) {
          const page = await conversationService.history(cid);
          if (!mountedRef.current) return;
          setMessages(Array.isArray(page.messages) ? page.messages.slice() : []);
          setHasMore(Boolean(page.hasMore));
          setNextBefore(page.nextBefore ?? null);
          markReadSafe(cid);
        } else {
          setMessages([]);
          setHasMore(false);
          setNextBefore(null);
        }
      } catch (e) {
        if (!mountedRef.current) return;
        setError(e?.response?.data?.message || e?.message || "Failed to load messages");
      } finally {
        if (mountedRef.current && !silent) setLoading(false);
        didInitialLoadRef.current = true;
      }
    },
    [clientId, markReadSafe]
  );

  // Initial load (and reload when the target client changes).
  useEffect(() => {
    mountedRef.current = true;
    didInitialLoadRef.current = false;
    load();
    return () => {
      mountedRef.current = false;
      if (typingClearTimer.current) clearTimeout(typingClearTimer.current);
    };
  }, [load]);

  // Load an older page (cursor pagination, newest-last). Prepends + de-dupes.
  const loadEarlier = useCallback(async () => {
    const cid = conversationIdRef.current;
    if (!cid || !hasMore || !nextBefore || loadingEarlier) return;
    setLoadingEarlier(true);
    try {
      const page = await conversationService.history(cid, { before: nextBefore });
      if (!mountedRef.current) return;
      setMessages((prev) => {
        const merged = prev.slice();
        (page.messages || []).forEach((m) => {
          if (!merged.some((x) => String(x._id) === String(m._id))) merged.push(m);
        });
        return merged.sort(byCreatedAt);
      });
      setHasMore(Boolean(page.hasMore));
      setNextBefore(page.nextBefore ?? null);
    } catch {
      /* keep what we have; user can retry */
    } finally {
      if (mountedRef.current) setLoadingEarlier(false);
    }
  }, [hasMore, nextBefore, loadingEarlier]);

  // ── live receive + receipts + presence + typing ──────────────────────────
  useEffect(() => {
    if (!socket) return undefined;

    const onNew = ({ conversationId: cid, message }) => {
      const current = conversationIdRef.current;
      if (current && String(cid) === String(current)) {
        setMessages((prev) => upsertMessage(prev, message));
        if (message?.senderRole && message.senderRole !== myRole) markReadSafe(current);
      } else if (!current) {
        // We were showing the "not started" state and the other party just
        // opened the conversation — re-resolve so it materializes for us too.
        load({ silent: true });
      }
    };

    const patchStatus = (cid, ids, patch) => {
      if (!cid || String(cid) !== String(conversationIdRef.current)) return;
      const idSet = new Set((ids || []).map(String));
      setMessages((prev) =>
        prev.map((m) =>
          idSet.has(String(m._id))
            ? { ...m, ...patch, status: maxStatus(m.status, patch.status) }
            : m
        )
      );
    };

    const onDelivered = ({ conversationId: cid, messageIds, deliveredAt }) =>
      patchStatus(cid, messageIds, { status: "delivered", deliveredAt });
    const onRead = ({ conversationId: cid, messageIds, readAt }) =>
      patchStatus(cid, messageIds, { status: "read", readAt });

    const onPresence = ({ userId, online, lastSeenAt }) => {
      if (!otherUserIdRef.current || String(userId) !== otherUserIdRef.current) return;
      setPresence((prev) => ({
        online: Boolean(online),
        lastSeenAt: lastSeenAt ?? prev.lastSeenAt,
      }));
    };

    const onTyping = ({ conversationId: cid, role, typing }) => {
      if (String(cid) !== String(conversationIdRef.current)) return;
      if (role === myRole) return; // ignore our own typing echoes
      if (typingClearTimer.current) clearTimeout(typingClearTimer.current);
      if (typing) {
        setOtherTyping(true);
        // Safety net in case a stop/auto-expire event is missed.
        typingClearTimer.current = setTimeout(() => setOtherTyping(false), TYPING_CLEAR_MS);
      } else {
        setOtherTyping(false);
      }
    };

    socket.on("message:new", onNew);
    socket.on("message:delivered", onDelivered);
    socket.on("message:read", onRead);
    socket.on("presence:update", onPresence);
    socket.on("typing", onTyping);

    return () => {
      socket.off("message:new", onNew);
      socket.off("message:delivered", onDelivered);
      socket.off("message:read", onRead);
      socket.off("presence:update", onPresence);
      socket.off("typing", onTyping);
    };
  }, [socket, myRole, markReadSafe, load]);

  // ── reconnect reconciliation ─────────────────────────────────────────────
  // The backend re-joins rooms + flushes delivery on reconnect; the client must
  // re-fetch so the thread is correct after a drop (no lost / duplicate msgs).
  useEffect(() => {
    if (!socket) return undefined;
    const onConnect = () => {
      if (didInitialLoadRef.current) load({ silent: true });
    };
    socket.on("connect", onConnect);
    return () => socket.off("connect", onConnect);
  }, [socket, load]);

  // ── typing emitter (composer drives this) ─────────────────────────────────
  const notifyTyping = useCallback(
    (isTyping) => {
      const cid = conversationIdRef.current;
      if (!socket || !connected || !cid) return;
      socket.emit(isTyping ? "typing:start" : "typing:stop", { conversationId: cid });
    },
    [socket, connected]
  );

  // ── send ──────────────────────────────────────────────────────────────
  const send = useCallback(
    async (raw) => {
      const body = (raw || "").trim();
      if (!body || sending) return;
      setSending(true);
      try {
        let result;
        if (socket && connected) {
          // Persist-then-emit over the socket; the ack returns the saved doc.
          result = await new Promise((resolve, reject) => {
            socket
              .timeout(10000)
              .emit("message:send", { clientId, body }, (err, ack) => {
                if (err) return reject(err);
                if (!ack?.ok) return reject(new Error(ack?.error || "Send failed"));
                resolve(ack);
              });
          });
        } else {
          // Socket down → REST fallback shares the same backend persist path.
          result = await conversationService.send({ clientId, body });
        }
        if (!mountedRef.current) return;

        const cid = result?.conversationId ?? null;
        if (cid) {
          setConversationId(cid);
          conversationIdRef.current = cid;
          setStarted(true);
        }
        if (result?.message) {
          setMessages((prev) => upsertMessage(prev, result.message));
        }
      } catch (e) {
        if (mountedRef.current) {
          setError(e?.response?.data?.message || e?.message || "Couldn't send message");
        }
        throw e;
      } finally {
        if (mountedRef.current) setSending(false);
      }
    },
    [clientId, socket, connected, sending]
  );

  return {
    loading,
    error,
    started,
    conversationId,
    otherParticipant,
    presence,
    otherTyping,
    messages,
    myRole,
    hasMore,
    loadingEarlier,
    sending,
    connected,
    send,
    notifyTyping,
    loadEarlier,
    reload: load,
  };
}
