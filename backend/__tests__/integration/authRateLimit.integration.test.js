"use strict";

/**
 * Auth rate-limiter integration — isolated in its own file so the 11 login
 * attempts don't starve the shared authLimiter for other auth tests (each test
 * file gets a fresh app + limiter under Jest's per-file module sandbox).
 */

const request = require("supertest");

const app = require("../../src/app");
const { startMemoryMongo, stopMemoryMongo } = require("./_setup");

jest.setTimeout(120000);

let mongod;
beforeAll(async () => {
  mongod = await startMemoryMongo();
});
afterAll(async () => {
  await stopMemoryMongo(mongod);
});

describe("authLimiter (10 requests / 15 min per IP)", () => {
  it("allows the first 10 login attempts, then returns 429 with the ApiError body", async () => {
    // Non-existent creds — the limiter counts requests regardless of outcome,
    // so the first 10 are 401 and the 11th is blocked before the handler runs.
    for (let i = 0; i < 10; i++) {
      const res = await request(app).post("/api/auth/login").send({ email: "nobody@test.local", password: "x" });
      expect(res.status).toBe(401);
    }

    const blocked = await request(app).post("/api/auth/login").send({ email: "nobody@test.local", password: "x" });
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({ success: false });
    expect(String(blocked.body.message)).toMatch(/too many/i);
  });
});
