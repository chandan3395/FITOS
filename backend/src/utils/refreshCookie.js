"use strict";

const REFRESH_COOKIE = "refreshToken";
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function refreshCookieOptions(nodeEnv) {
  return {
    httpOnly: true,
    secure: nodeEnv === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: REFRESH_TTL_MS,
  };
}

module.exports = { REFRESH_COOKIE, REFRESH_TTL_MS, refreshCookieOptions };
