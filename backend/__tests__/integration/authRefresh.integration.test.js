"use strict";

/**
 * Auth refresh-rotation + disabled-account integration.
 *
 * Kept in its OWN file (separate rate-limiter instance) and deliberately under
 * the 10-request authLimiter budget: this file makes 2 logins + 3 refreshes.
 */

const bcrypt = require("bcryptjs");
const request = require("supertest");

const app = require("../../src/app");
const { User } = require("../../src/schemas/User.schema");
const { startMemoryMongo, stopMemoryMongo, tokenFor, uniqEmail } = require("./_setup");

jest.setTimeout(120000);

const PASSWORD = "Sup3r-secret!";
let mongod;
let activeEmail;
let disabled;

beforeAll(async () => {
  mongod = await startMemoryMongo();
  const hash = await bcrypt.hash(PASSWORD, 10);
  activeEmail = uniqEmail("active");
  await User.create({ name: "Active", email: activeEmail, password: hash, role: "TRAINER", isActive: true });
  disabled = await User.create({ name: "Disabled", email: uniqEmail("disabled"), password: hash, role: "TRAINER", isActive: false });
});

afterAll(async () => {
  await stopMemoryMongo(mongod);
});

const refreshCookie = (res) => {
  const raw = (res.headers["set-cookie"] || []).find((c) => c.startsWith("refreshToken="));
  return raw ? raw.split(";")[0] : null; // "refreshToken=<value>"
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe("refresh-token rotation", () => {
  it("rotates on use and rejects a replayed (old) refresh token", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: activeEmail, password: PASSWORD });
    expect(login.status).toBe(200);
    const r1 = refreshCookie(login);
    expect(r1).toBeTruthy();

    // >1s so the new refresh JWT's iat differs and the token bytes change.
    await sleep(1100);

    const first = await request(app).post("/api/auth/refresh").set("Cookie", r1);
    expect(first.status).toBe(200);
    expect(first.body.data.accessToken).toEqual(expect.any(String));
    const r2 = refreshCookie(first);
    expect(r2).toBeTruthy();
    expect(r2).not.toBe(r1); // rotated

    // Replaying the ORIGINAL token now fails — it was replaced in the DB.
    const replay = await request(app).post("/api/auth/refresh").set("Cookie", r1);
    expect(replay.status).toBe(401);

    // The rotated token still works.
    const withNew = await request(app).post("/api/auth/refresh").set("Cookie", r2);
    expect(withNew.status).toBe(200);
  });
});

describe("disabled account is blocked everywhere", () => {
  it("cannot log in (403)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: disabled.email, password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false });
  });

  it("an access token for a disabled user is rejected by authenticate (401)", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${tokenFor(disabled)}`);
    expect(res.status).toBe(401);
  });
});
