"use strict";

const {
  REFRESH_COOKIE,
  REFRESH_TTL_MS,
  refreshCookieOptions,
} = require("../../src/utils/refreshCookie");

test("production refresh cookies are persistent, host-only, secure and narrowly scoped", () => {
  expect(REFRESH_COOKIE).toBe("refreshToken");
  expect(refreshCookieOptions("production")).toEqual({
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: REFRESH_TTL_MS,
  });
  expect(refreshCookieOptions("production")).not.toHaveProperty("domain");
  expect(REFRESH_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
});

test("local refresh cookies retain the same scope without requiring HTTPS", () => {
  expect(refreshCookieOptions("development")).toMatchObject({
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/api/auth",
  });
});
