"use strict";
const request = require("supertest");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const app = require("../../src/app");
const { env } = require("../../src/config/env");
const { User } = require("../../src/schemas/User.schema");
const { ByotProfile } = require("../../src/schemas/ByotProfile.schema");
const { ByotProgress } = require("../../src/schemas/ByotProgress.schema");
const { startMemoryMongo, stopMemoryMongo, tokenFor, uniqEmail } = require("./_setup");
const refreshToken = require("../../src/utils/generateRefreshToken");
const accessToken = require("../../src/utils/generateAccessToken");
jest.setTimeout(120000);
let db, admin, user;
const root = "/api/admin/byot-users";
const call = (method, path = "", body, actor = admin) => {
  let r = request(app)[method](root + path);
  if (actor) r = r.set("Authorization", `Bearer ${tokenFor(actor)}`);
  return body === undefined ? r : r.send(body);
};
const status = (active, expected = !active) =>
  call("patch", `/${user._id}`, { isActive: active, expectedIsActive: expected });
beforeAll(async () => {
  db = await startMemoryMongo();
  await User.init();
});
afterAll(async () => {
  await stopMemoryMongo(db);
});
beforeEach(async () => {
  await User.deleteMany({});
  admin = await User.create({ name: "Admin", email: uniqEmail("admin"), role: "ADMIN" });
  user = await User.create({
    name: "Alice [test]",
    email: uniqEmail("alice"),
    role: "BYOT",
    googleId: "private-identity",
    profileImage: "private-url",
  });
});
it("lists only approved account fields without reading any personal collection", async () => {
  const accountQuery = jest.spyOn(User, "find");
  const profile = jest.spyOn(ByotProfile, "findOne").mockImplementation(() => {
    throw Error("Must not read profiles");
  });
  const progress = jest.spyOn(ByotProgress, "find").mockImplementation(() => {
    throw Error("Must not read records");
  });
  try {
    const r = await call("get");
    expect(r.status).toBe(200);
    expect(r.headers["cache-control"]).toBe("private, no-store");
    expect(r.body.data.total).toBe(1);
    expect(Object.keys(r.body.data.items[0]).sort()).toEqual(
      ["_id", "name", "email", "createdAt", "lastActiveAt", "isActive"].sort()
    );
    expect(r.body.data.items[0].lastActiveAt).toBeNull();
    expect(profile).not.toHaveBeenCalled();
    expect(progress).not.toHaveBeenCalled();
    expect(accountQuery.mock.results[0].value.projection()).toEqual({
      _id: 1,
      name: 1,
      email: 1,
      createdAt: 1,
      lastActiveAt: 1,
      isActive: 1,
    });
  } finally {
    profile.mockRestore();
    progress.mockRestore();
    accountQuery.mockRestore();
  }
});
it("uses account creation and real last activity, not updatedAt or messaging presence", async () => {
  const signup = new Date("2020-01-01"),
    active = new Date("2025-01-01");
  await User.collection.updateOne(
    { _id: user._id },
    {
      $set: {
        createdAt: signup,
        lastActiveAt: active,
        updatedAt: new Date(),
        lastSeenAt: new Date(),
      },
    }
  );
  expect((await call("get")).body.data.items[0]).toMatchObject({
    createdAt: signup.toISOString(),
    lastActiveAt: active.toISOString(),
  });
});
it("paginates in stable creation/id order and searches literal name/email case-insensitively", async () => {
  await User.create({
    name: "Bob",
    email: "bob@test.local",
    role: "BYOT",
    isActive: false,
    createdAt: user.createdAt,
  });
  const first = await call("get", "?limit=1&page=1");
  const second = await call("get", "?limit=1&page=2");
  expect(first.body.data.pages).toBe(2);
  expect(first.body.data.items[0]._id).not.toBe(second.body.data.items[0]._id);
  expect((await call("get", "?search=%5Btest%5D")).body.data.items[0]._id).toBe(String(user._id));
  expect((await call("get", "?search=BOB%40TEST")).body.data.total).toBe(1);
  expect((await call("get", "?search=.*")).body.data.total).toBe(0);
  expect((await call("get", "?status=disabled")).body.data.items[0].name).toBe("Bob");
  expect((await call("get", "?status=active")).body.data.total).toBe(1);
  expect((await call("get", "?page=10")).body.data.items).toEqual([]);
});
it.each([
  "?limit=0",
  "?limit=101",
  "?page=-1",
  "?page=10001",
  "?page=1.2",
  "?status=true",
  "?search[x]=y",
  "?search=" + "a".repeat(101),
  "?ownerId=x",
])("rejects malformed list query %s", async (q) => {
  expect((await call("get", q)).status).toBe(400);
});
it.each(["BYOT", "CLIENT", "TRAINER", "anonymous", "disabled-admin"])(
  "denies management to %s",
  async (role) => {
    const actor =
      role === "anonymous"
        ? null
        : await User.create({
            name: role,
            email: uniqEmail(role),
            role: role === "disabled-admin" ? "ADMIN" : role,
            isActive: role !== "disabled-admin",
          });
    const expected = ["anonymous", "disabled-admin"].includes(role) ? 401 : 403;
    expect((await call("get", "", undefined, actor)).status).toBe(expected);
    expect(
      (await call("patch", `/${user._id}`, { isActive: false, expectedIsActive: true }, actor))
        .status
    ).toBe(expected);
  }
);
it.each(["ADMIN", "TRAINER", "CLIENT"])("never changes a %s target", async (role) => {
  const target = await User.create({ name: role, email: uniqEmail(role), role });
  expect(
    (await call("patch", `/${target._id}`, { isActive: false, expectedIsActive: true })).status
  ).toBe(404);
  expect((await User.findById(target._id)).isActive).toBe(true);
});
it.each([
  {},
  { isActive: "false", expectedIsActive: true },
  { isActive: 0, expectedIsActive: true },
  { isActive: false },
  { isActive: false, expectedIsActive: "true" },
  { isActive: false, expectedIsActive: true, role: "ADMIN" },
  { isActive: false, expectedIsActive: true, ownerId: "forged" },
  { isActive: false, expectedIsActive: true, sessionVersion: 0 },
])("rejects status mass assignment / coercion %j", async (body) => {
  expect((await call("patch", `/${user._id}`, body)).status).toBe(400);
  expect((await User.findById(user._id)).isActive).toBe(true);
});
it("handles duplicate disables atomically and never resurrects old access/refresh sessions", async () => {
  const legacy = jwt.sign({ userId: user._id, role: "BYOT" }, env.JWT_SECRET, { expiresIn: "10m" });
  const oldRefresh = refreshToken(user._id);
  await User.updateOne({ _id: user._id }, { refreshToken: oldRefresh });
  const me = (token) => request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
  expect((await me(legacy)).status).toBe(200);
  const results = await Promise.all([status(false), status(false)]);
  expect(results.map((r) => r.status)).toEqual([200, 200]);
  let current = await User.findById(user._id).select("+refreshToken");
  expect(current.sessionVersion).toBe(1);
  expect(current.refreshToken).toBeNull();
  expect((await me(legacy)).status).toBe(401);
  expect((await status(true)).status).toBe(200);
  expect((await me(legacy)).status).toBe(401);
  const refreshed = await request(app)
    .post("/api/auth/refresh")
    .set("X-FITOS-CSRF", "1")
    .set("Cookie", `refreshToken=${oldRefresh}`);
  expect(refreshed.status).toBe(401);
  // Synthetic password only on this test account; production BYOT still uses Google.
  await User.updateOne(
    { _id: user._id },
    { password: await bcrypt.hash("synthetic-test-password", 4) }
  );
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: user.email, password: "synthetic-test-password" });
  expect(login.status).toBe(200);
  expect(jwt.decode(login.body.data.accessToken).sv).toBe(1);
  expect((await me(login.body.data.accessToken)).status).toBe(200);
  current = await User.findById(user._id).select("+refreshToken");
  expect(jwt.decode(current.refreshToken).sv).toBe(1);
});
it.each(["ADMIN", "TRAINER", "CLIENT"])(
  "preserves legacy unversioned %s sessions",
  async (role) => {
    const actor = await User.create({ role, name: role, email: uniqEmail(role) });
    await User.collection.updateOne({ _id: actor._id }, { $unset: { sessionVersion: "" } });
    const token = jwt.sign({ userId: actor._id, role }, env.JWT_SECRET);
    expect(
      (await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`)).status
    ).toBe(200);
    const refresh = jwt.sign({ userId: actor._id }, env.JWT_REFRESH_SECRET);
    await User.updateOne({ _id: actor._id }, { refreshToken: refresh });
    expect(
      (
        await request(app)
          .post("/api/auth/refresh")
          .set("X-FITOS-CSRF", "1")
          .set("Cookie", `refreshToken=${refresh}`)
      ).status
    ).toBe(200);
  }
);
it("checks disabled sign-in and rejects forged session versions", async () => {
  await status(false);
  expect(
    (await request(app).post("/api/auth/login").send({ email: user.email, password: "anything" }))
      .status
  ).toBe(403);
  await status(true);
  expect(
    (
      await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${accessToken(user._id, "BYOT", "1")}`)
    ).status
  ).toBe(401);
});
it("rejects invalid IDs and stale no-change status requests", async () => {
  expect(
    (await call("patch", "/invalid", { isActive: false, expectedIsActive: true })).status
  ).toBe(400);
  expect((await status(false, false)).status).toBe(409);
});
it("does not cache unauthenticated, parser-error, or session responses and never grants wildcard CORS", async () => {
  for (const path of [
    root,
    "/api/byot/progress/summary",
    "/api/byot/progress/checkins/2026-09-20/photos/front/original",
    "/api/auth/me",
  ]) {
    const r = await request(app).get(path).set("Origin", "https://untrusted.example");
    expect(r.status).toBe(401);
    expect(r.headers["cache-control"]).toBe("private, no-store");
    expect(r.headers["access-control-allow-origin"]).not.toBe("*");
    expect(r.headers["access-control-allow-origin"]).not.toBe("https://untrusted.example");
  }
  const malformed = await request(app)
    .put("/api/byot/progress/records/2026-09-20")
    .set("Content-Type", "application/json")
    .send("{");
  expect(malformed.status).toBe(400);
  expect(malformed.headers["cache-control"]).toBe("private, no-store");
});
it("a refresh racing an admin disable cannot restore the revoked credential", async () => {
  const old = refreshToken(user._id);
  await User.updateOne({ _id: user._id }, { refreshToken: old });
  const original = User.updateOne.bind(User);
  const update = jest.spyOn(User, "updateOne").mockImplementationOnce(async (...args) => {
    await status(false);
    return original(...args);
  });
  try {
    const r = await request(app)
      .post("/api/auth/refresh")
      .set("X-FITOS-CSRF", "1")
      .set("Cookie", `refreshToken=${old}`);
    expect(r.status).toBe(401);
    expect((await User.findById(user._id).select("+refreshToken")).refreshToken).toBeNull();
  } finally {
    update.mockRestore();
  }
});
it("a sign-in racing a disable cannot issue or store a new session", async () => {
  await User.updateOne({ _id: user._id }, { password: await bcrypt.hash("test-password", 4) });
  const compare = jest.spyOn(bcrypt, "compare").mockImplementationOnce(async () => {
    await status(false);
    return true;
  });
  try {
    const r = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "test-password" });
    expect(r.status).toBe(401);
    expect((await User.findById(user._id).select("+refreshToken")).refreshToken).toBeNull();
  } finally {
    compare.mockRestore();
  }
});
