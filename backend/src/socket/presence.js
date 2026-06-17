"use strict";

/**
 * In-memory presence registry (process singleton).
 *
 * Sockets are delivery only and presence is ephemeral, so "online" lives in
 * memory: a userId is online while it has at least one connected socket. The
 * REST conversation list reads `isOnline()` directly; "last seen" is persisted
 * to the User document on full disconnect (handled by the socket layer).
 *
 * A user may have several concurrent sockets (multiple tabs/devices) — we
 * ref-count them so closing one tab doesn't flip the user offline while
 * another is still open.
 */

// userId(string) -> Set<socketId>
const connections = new Map();

const key = (userId) => String(userId);

/**
 * Register a socket for a user.
 * @returns {boolean} true if this connection brought the user ONLINE (i.e. it
 *   was their first socket) — the caller broadcasts a presence update only then.
 */
function addConnection(userId, socketId) {
  const k = key(userId);
  let set = connections.get(k);
  const wasOffline = !set || set.size === 0;
  if (!set) {
    set = new Set();
    connections.set(k, set);
  }
  set.add(socketId);
  return wasOffline;
}

/**
 * Remove a socket for a user.
 * @returns {boolean} true if the user is now FULLY offline (no sockets left) —
 *   the caller persists last-seen and broadcasts a presence update only then.
 */
function removeConnection(userId, socketId) {
  const k = key(userId);
  const set = connections.get(k);
  if (!set) return false;
  set.delete(socketId);
  if (set.size === 0) {
    connections.delete(k);
    return true;
  }
  return false;
}

function isOnline(userId) {
  const set = connections.get(key(userId));
  return Boolean(set && set.size > 0);
}

/** All currently-online user ids (as strings). */
function onlineUserIds() {
  return [...connections.keys()];
}

/** Test/util hook — drop all state. */
function _reset() {
  connections.clear();
}

module.exports = {
  addConnection,
  removeConnection,
  isOnline,
  onlineUserIds,
  _reset,
};
