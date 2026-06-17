import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuthContext } from "./AuthContext";
import { useSocket } from "./SocketContext";
import conversationService from "../services/conversationService";

/**
 * App-level unread tracking for the messaging badges (trainer per-client tab +
 * client portal nav). Counts come straight from the backend's per-participant
 * unread on each conversation (the list endpoint) — we never recount messages
 * client-side. The list is (debounced) re-fetched whenever a relevant socket
 * event lands, so badges appear/clear live without a refresh.
 *
 * The currently-open thread registers itself as the "active" conversation; its
 * badge is forced to 0 while viewed (the thread marks it read on the backend),
 * which keeps the badge from flickering between a refetch and the read landing.
 */
const UnreadContext = createContext({
  total: 0,
  unreadForClient: () => 0,
  refresh: () => {},
  setActive: () => {},
  clearActive: () => {},
});

export const UnreadProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuthContext();
  const { socket } = useSocket();

  const [rows, setRows] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const debounceRef = useRef(null);
  const mountedRef = useRef(true);

  const role = user?.role;
  // Messaging is trainer↔client only; admins have no conversations (would 403).
  const enabled = isAuthenticated && (role === "TRAINER" || role === "CLIENT");

  const doFetch = useCallback(async () => {
    if (!enabled) {
      setRows([]);
      return;
    }
    try {
      const list = await conversationService.list();
      if (mountedRef.current) setRows(Array.isArray(list) ? list : []);
    } catch {
      /* transient — leave the last known counts in place */
    }
  }, [enabled]);

  const refresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doFetch(), 300);
  }, [doFetch]);

  // Initial load + reset when auth/role changes.
  useEffect(() => {
    mountedRef.current = true;
    if (enabled) doFetch();
    else setRows([]);
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [enabled, doFetch]);

  // Live: a new incoming message (or a read) can change my unread → resync.
  useEffect(() => {
    if (!socket || !enabled) return undefined;
    const myRole = role === "TRAINER" ? "trainer" : "client";
    const onNew = ({ message }) => {
      // My own echoed messages never change MY unread; only the other party's do.
      if (message?.senderRole && message.senderRole !== myRole) refresh();
    };
    const onRead = () => refresh();
    // On (re)connect, resync counts: messages may have landed while offline.
    const onConnect = () => refresh();
    socket.on("message:new", onNew);
    socket.on("message:read", onRead);
    socket.on("connect", onConnect);
    return () => {
      socket.off("message:new", onNew);
      socket.off("message:read", onRead);
      socket.off("connect", onConnect);
    };
  }, [socket, enabled, role, refresh]);

  const setActive = useCallback((cid) => setActiveConv(cid ? String(cid) : null), []);
  const clearActive = useCallback(() => {
    setActiveConv(null);
    refresh();
  }, [refresh]);

  const isActive = (cid) => activeConv && String(cid) === activeConv;

  const unreadForClient = useCallback(
    (clientId) => {
      if (!clientId) return 0;
      const row = rows.find((r) => String(r.clientId) === String(clientId));
      if (!row) return 0;
      if (activeConv && String(row.conversationId) === activeConv) return 0;
      return Number(row.unread) || 0;
    },
    [rows, activeConv]
  );

  const total = rows.reduce(
    (sum, r) => sum + (isActive(r.conversationId) ? 0 : Number(r.unread) || 0),
    0
  );

  return (
    <UnreadContext.Provider value={{ total, unreadForClient, refresh, setActive, clearActive }}>
      {children}
    </UnreadContext.Provider>
  );
};

export const useUnread = () => useContext(UnreadContext);
