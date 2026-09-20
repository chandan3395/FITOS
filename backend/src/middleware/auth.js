"use strict";

const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { User } = require("../schemas/User.schema");
const ApiError = require("../utils/ApiError");
const session = require("../utils/session");

/**
 * Authentication middleware — JWT access token only.
 *
 * Validates the `Authorization: Bearer <token>` header, verifies it against
 * JWT_SECRET, and loads the active user. There is no fallback auth path.
 */
async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new ApiError(401, "No token provided");
    }

    const token = header.slice(7);
    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive || !session.matches(user, decoded)) {
      throw new ApiError(401, "Session revoked or account disabled. Please sign in again.");
    }

    req.user = user;
    session.scope.run({ id: user._id, role: user.role, version: session.versionOf(user) }, next);
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(new ApiError(401, "Invalid or expired token"));
  }
}

module.exports = authenticate;
