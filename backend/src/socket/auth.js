"use strict";

const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { User } = require("../schemas/User.schema");

/**
 * Socket.IO handshake authentication — the SAME JWT access-token mechanism as
 * the REST `authenticate` middleware (verify against JWT_SECRET, load an active
 * User). No parallel auth: an unauthenticated handshake is rejected so a socket
 * never exists without a known, active user behind it.
 *
 * The client supplies the access token via `socket.handshake.auth.token`
 * (socket.io-client convention) or an `Authorization: Bearer <token>` header.
 */
function extractToken(socket) {
  const fromAuth = socket.handshake?.auth?.token;
  if (fromAuth) return String(fromAuth).replace(/^Bearer\s+/i, "");

  const header = socket.handshake?.headers?.authorization;
  if (header && header.startsWith("Bearer ")) return header.slice(7);

  return null;
}

async function authenticateSocket(socket, next) {
  try {
    const token = extractToken(socket);
    if (!token) return next(new Error("Unauthorized: no token"));

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) return next(new Error("Unauthorized"));

    // Attach the user for the connection's lifetime.
    socket.user = user;
    return next();
  } catch {
    return next(new Error("Unauthorized: invalid or expired token"));
  }
}

module.exports = { authenticateSocket, extractToken };
