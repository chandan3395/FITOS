"use strict";

const { rateLimit } = require("express-rate-limit");

const WINDOW_MS = 15 * 60 * 1000;

// `message` objects are serialized as the JSON response body, matching the
// { success, message } envelope the error handler produces for ApiError.
function buildLimiter({ limit, message }) {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
  });
}

// Credential-bearing auth endpoints: tight limit to slow brute force.
const authLimiter = buildLimiter({
  limit: 10,
  message: "Too many authentication attempts. Please try again later.",
});

// Whole-API backstop.
const globalLimiter = buildLimiter({
  limit: 300,
  message: "Too many requests. Please try again later.",
});

module.exports = { authLimiter, globalLimiter };
