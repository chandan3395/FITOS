import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuthContext } from "./AuthContext";
import { getAccessToken } from "../lib/api";

/**
 * One authenticated Socket.IO connection for the logged-in user, shared across
 * the whole app (NOT one per conversation or per tab). The backend joins the
 * socket to a room per conversation on connect and flushes delivery on
 * reconnect; individual threads just subscribe to events on this socket.
 */
const SocketContext = createContext({ socket: null, connected: false });

// In dev (VITE_API_URL unset) the socket connects same-origin and Vite's
// /socket.io ws proxy forwards it to the backend. In production VITE_API_URL
// is the full backend base (e.g. https://api.example.com/api); the socket
// server lives at that ORIGIN's /socket.io, so strip the path.
const SOCKET_URL = (() => {
  const base = import.meta.env.VITE_API_URL;
  if (!base) return undefined; // same-origin (dev proxy)
  try {
    return new URL(base, window.location.origin).origin;
  } catch {
    return undefined;
  }
})();

export const SocketProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuthContext();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setSocket(null);
      setConnected(false);
      return undefined;
    }

    // `auth` is a callback so the CURRENT access token is read on every
    // (re)connection attempt — including reconnects after a token refresh.
    const s = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      auth: (cb) => cb({ token: getAccessToken() }),
    });

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    setSocket(s);
    s.connect();

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
    // Recreate the socket when the signed-in user changes (login/logout/switch).
  }, [isAuthenticated, user?._id]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
