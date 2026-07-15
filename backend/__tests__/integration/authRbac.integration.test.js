"use strict";

/**
 * Auth & RBAC integration tests.
 *
 * Runs the REAL Express app (src/app.js — full middleware chain: helmet,
 * rate limiting, mongo-sanitize, auth, RBAC, error handler) against an
 * in-memory MongoDB. Nothing in the DB layer is mocked.
 *
 * NOTE: the auth rate limiter allows 10 requests / 15 min per IP on the
 * login routes. All tests here share one supertest agent (one IP), so keep
 * the total number of /login + /admin/login calls in this file below 10.
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../../src/app");
const { env } = require("../../src/config/env");
const { User } = require("../../src/schemas/User.schema");
const { Client } = require("../../src/schemas/Client.schema");
const generateAccessToken = require("../../src/utils/generateAccessToken");

// First run downloads a mongod binary; allow for slow networks.
jest.setTimeout(120000);

const PASSWORD = "Sup3r-secret!";

let mongod;
let admin, adminDisabled, trainerA, trainerB;
let clientOfA;
let trainerAToken, trainerBToken;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const hash = await bcrypt.hash(PASSWORD, 10);

  [admin, adminDisabled, trainerA, trainerB] = await User.create([
    { name: "Admin",           email: "admin@test.local",    password: hash, role: "ADMIN",   isActive: true },
    { name: "Disabled Admin",  email: "disabled@test.local", password: hash, role: "ADMIN",   isActive: false },
    { name: "Trainer A",       email: "trainer.a@test.local", role: "TRAINER", isActive: true },
    { name: "Trainer B",       email: "trainer.b@test.local", role: "TRAINER", isActive: true },
  ]);

  clientOfA = await Client.create({
    trainerId: trainerA._id,
    name: "Client Of A",
  });

  trainerAToken = generateAccessToken(trainerA._id, trainerA.role);
  trainerBToken = generateAccessToken(trainerB._id, trainerB.role);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe("POST /api/auth/admin/login", () => {
  it("logs in an active admin with correct credentials", async () => {
    const res = await request(app)
      .post("/api/auth/admin/login")
      .send({ email: "admin@test.local", password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({ email: "admin@test.local", role: "ADMIN" });
    // Refresh cookie is issued alongside the access token.
    const cookies = res.headers["set-cookie"] || [];
    expect(cookies.some((c) => c.startsWith("refreshToken="))).toBe(true);
  });

  it("rejects a wrong password with 401", async () => {
    const res = await request(app)
      .post("/api/auth/admin/login")
      .send({ email: "admin@test.local", password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, message: "Invalid credentials" });
  });

  it("rejects a disabled account with 403 even with the right password", async () => {
    const res = await request(app)
      .post("/api/auth/admin/login")
      .send({ email: "disabled@test.local", password: PASSWORD });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false, message: "Account disabled" });
  });
});

describe("authenticate middleware (GET /api/auth/me)", () => {
  it("rejects a request with no token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects a non-Bearer authorization header", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Basic abc123");
    expect(res.status).toBe(401);
  });

  it("rejects a malformed token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not-a-jwt");
    expect(res.status).toBe(401);
  });

  it("rejects an expired token", async () => {
    const expired = jwt.sign(
      { userId: String(trainerA._id), role: trainerA.role },
      env.JWT_SECRET,
      { expiresIn: -10 } // already expired
    );
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  it("rejects a token signed with the wrong secret", async () => {
    const forged = jwt.sign(
      { userId: String(trainerA._id), role: trainerA.role },
      "definitely-not-the-secret",
      { expiresIn: "10m" }
    );
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it("accepts a valid token (sanity)", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${trainerAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: "trainer.a@test.local", role: "TRAINER" });
  });
});

describe("allowRoles (POST /api/auth/admin/create is ADMIN-only)", () => {
  it("blocks a TRAINER with 403", async () => {
    const res = await request(app)
      .post("/api/auth/admin/create")
      .set("Authorization", `Bearer ${trainerAToken}`)
      .send({ name: "New Admin", email: "new.admin@test.local", password: PASSWORD });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false, message: "Forbidden" });
    // Nothing was created.
    expect(await User.countDocuments({ email: "new.admin@test.local" })).toBe(0);
  });
});

describe("ownership — trainer B vs trainer A's client", () => {
  it("trainer A can read their own client (sanity)", async () => {
    const res = await request(app)
      .get(`/api/clients/${clientOfA._id}`)
      .set("Authorization", `Bearer ${trainerAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.client).toMatchObject({ name: "Client Of A" });
  });

  it("trainer B cannot read trainer A's client", async () => {
    const res = await request(app)
      .get(`/api/clients/${clientOfA._id}`)
      .set("Authorization", `Bearer ${trainerBToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("trainer B cannot modify trainer A's client", async () => {
    const res = await request(app)
      .patch(`/api/clients/${clientOfA._id}`)
      .set("Authorization", `Bearer ${trainerBToken}`)
      .send({ name: "Hijacked" });
    expect(res.status).toBe(403);

    const fresh = await Client.findById(clientOfA._id);
    expect(fresh.name).toBe("Client Of A");
  });

  it("trainer B cannot delete trainer A's client", async () => {
    const res = await request(app)
      .delete(`/api/clients/${clientOfA._id}`)
      .set("Authorization", `Bearer ${trainerBToken}`);
    expect(res.status).toBe(403);

    const fresh = await Client.findById(clientOfA._id);
    expect(fresh.isDeleted).not.toBe(true);
  });

  it("a nonexistent client id returns 404 (not a different trainer's data)", async () => {
    const missingId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/clients/${missingId}`)
      .set("Authorization", `Bearer ${trainerAToken}`);
    expect(res.status).toBe(404);
  });
});
