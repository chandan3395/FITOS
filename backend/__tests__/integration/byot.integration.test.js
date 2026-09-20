"use strict";
const request = require("supertest");
const app = require("../../src/app");
const { User } = require("../../src/schemas/User.schema");
const { Client } = require("../../src/schemas/Client.schema");
const { ByotProfile } = require("../../src/schemas/ByotProfile.schema");
const service = require("../../src/services/byot.service");
const identity = require("../../src/services/googleIdentity.service");
const state = require("../../src/utils/oauthState");
const { startMemoryMongo, stopMemoryMongo, tokenFor, uniqEmail } = require("./_setup");
jest.setTimeout(120000);
let db, a, b;
const payload = {
  startingWeightKg: 75,
  heightCm: 175,
  goal: "Build strength",
  timezone: "America/New_York",
};
const google = (email, id = email) => ({
  id,
  displayName: "Google User",
  emails: [{ value: email }],
  _json: { email_verified: true },
});
const signIn = (intent, profile) =>
  new Promise((resolve) =>
    identity({ oauthState: intent ? { intent } : null }, null, null, profile, (err, user, info) =>
      resolve({ err, user, info })
    )
  );
const call = (user, method, path) =>
  request(app)
    [method](`/api/byot${path}`)
    .set("Authorization", `Bearer ${tokenFor(user)}`);
beforeAll(async () => {
  db = await startMemoryMongo();
  await Promise.all([User.init(), ByotProfile.init(), state.OAuthState.init()]);
  [a, b] = await Promise.all(
    ["a", "b"].map((x) => User.create({ name: x, email: uniqEmail(x), role: "BYOT" }))
  );
});
afterAll(() => stopMemoryMongo(db));
it("creates and returns the same BYOT identity and one profile under concurrency", async () => {
  const email = uniqEmail("google");
  const first = await signIn("BYOT", google(email));
  const again = await signIn("BYOT", google(email));
  expect(first.err).toBeNull();
  expect(first.user.role).toBe("BYOT");
  expect(String(again.user._id)).toBe(String(first.user._id));
  await Promise.all(Array.from({ length: 8 }, () => service.ensureProfile(first.user._id)));
  expect(await ByotProfile.countDocuments({ ownerId: first.user._id })).toBe(1);
  await expect(ByotProfile.create({ ownerId: first.user._id })).rejects.toMatchObject({
    code: 11000,
  });
  expect(await Client.countDocuments({ userId: first.user._id })).toBe(0);
});
it.each(["ADMIN", "TRAINER", "CLIENT"])("preserves %s identity on BYOT conflict", async (role) => {
  const user = await User.create({ name: role, email: uniqEmail(role), role });
  const result = await signIn("BYOT", google(user.email));
  expect(result.info.code).toBe("account_conflict");
  const saved = await User.findById(user._id);
  expect(saved.role).toBe(role);
  expect(saved.googleId).toBeUndefined();
  expect(await ByotProfile.countDocuments({ ownerId: user._id })).toBe(0);
});
it("retains trainer/client sign-in and refuses missing state or reverse conversion", async () => {
  for (const role of ["TRAINER", "CLIENT"]) {
    const result = await signIn(role, google(uniqEmail(role)));
    expect(result.user.role).toBe(role);
  }
  expect((await signIn(null, google(uniqEmail("invalid")))).err).toBeTruthy();
  expect((await signIn("CLIENT", google(a.email))).info.code).toBe("account_conflict");
});
it("isolates owners, persists onboarding once, and uses local calendar days", async () => {
  expect((await request(app).get("/api/byot/profile")).status).toBe(401);
  const saved = await call(a, "post", "/onboarding").send(payload);
  expect(saved.status).toBe(200);
  const again = await call(a, "post", "/onboarding").send({ ...payload, startingWeightKg: 90 });
  expect(again.body.data).toEqual(saved.body.data);
  const other = await call(b, "get", `/profile?ownerId=${a._id}`);
  expect(other.body.data.startingWeightKg).toBeUndefined();
  expect((await call(b, "get", `/profile/${a._id}`)).status).toBe(404);
  expect(service.localDate(new Date("2026-03-08T04:30:00Z"), "America/New_York")).toBe(
    "2026-03-07"
  );
  expect(
    service.serialize({ toObject: () => ({ checkInAnchorDate: "2026-03-07" }) }).nextCheckInDate
  ).toBe("2026-03-14");
  const firstActivity = (await User.findById(a._id)).lastActiveAt;
  await call(a, "get", "/profile");
  expect((await User.findById(a._id)).lastActiveAt).toEqual(firstActivity);
});
it.each(["ADMIN", "TRAINER", "CLIENT"])("denies %s personal API reads and writes", async (role) => {
  const user = await User.create({ name: role, email: uniqEmail(role), role });
  expect((await call(user, "get", "/profile")).status).toBe(403);
  expect((await call(user, "post", "/onboarding").send(payload)).status).toBe(403);
});
it.each([
  "ownerId",
  "role",
  "isActive",
  "status",
  "onboardingCompletedAt",
  "checkInAnchorDate",
  "lastActiveAt",
  "createdAt",
])("rejects forged %s", async (field) => {
  expect(
    (await call(b, "post", "/onboarding").send({ ...payload, [field]: "forged" })).status
  ).toBe(400);
});
it.each([
  { startingWeightKg: "75" },
  { heightCm: 0 },
  { timezone: "Fake/Zone" },
  { goal: "x".repeat(201) },
  { targetWeightKg: null },
])("validates onboarding %j", async (invalid) => {
  expect((await call(b, "post", "/onboarding").send({ ...payload, ...invalid })).status).toBe(400);
});
it("denies previously issued sessions after disable", async () => {
  const token = tokenFor(b);
  await User.updateOne({ _id: b._id }, { isActive: false });
  expect(
    (await request(app).get("/api/byot/profile").set("Authorization", `Bearer ${token}`)).status
  ).toBe(401);
});
async function begin(query = { intent: "byot" }) {
  let browser;
  const raw = await state.begin(
    { query },
    {
      cookie: (_name, value) => {
        browser = value;
      },
    }
  );
  return { query: { state: raw }, cookies: { [state.COOKIE]: browser } };
}
it("validates opaque state integrity, binding, expiry, replay and invite intent", async () => {
  const req = await begin();
  expect(await state.consume({ ...req, query: { state: "tampered" } })).toBeNull();
  expect(await state.consume({ ...req, cookies: { [state.COOKIE]: "wrong-browser" } })).toBeNull();
  const results = await Promise.all([state.consume(req), state.consume(req)]);
  expect(results.filter(Boolean)).toHaveLength(1);
  expect(results.find(Boolean).intent).toBe("BYOT");
  expect(await state.consume(req)).toBeNull();
  const expired = await begin();
  await state.OAuthState.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });
  expect(await state.consume(expired)).toBeNull();
  const invite = await state.consume(
    await begin({ invite: "secret-invite", role: "ADMIN", intent: "byot", platform: "mobile" })
  );
  expect(invite.intent).toBe("CLIENT");
  expect(invite.invite).toBe("secret-invite");
  expect(invite.platform).toBe("mobile");
  const forgedRole = await state.consume(
    await begin({ role: "ADMIN", redirect: "https://evil.test" })
  );
  expect(forgedRole.intent).toBe("CLIENT");
});
it("rejects cross-origin and missing-origin cookie actions", async () => {
  expect(
    (await request(app).post("/api/auth/logout").set("Origin", "https://evil.test")).status
  ).toBe(403);
  expect((await request(app).post("/api/auth/refresh")).status).toBe(403);
  expect((await request(app).post("/api/auth/logout").set("X-FITOS-CSRF", "1")).status).toBe(200);
});

it("handles concurrent first sign-ins without duplicate identities", async () => {
  const email = uniqEmail("race");
  const results = await Promise.all([signIn("BYOT", google(email)), signIn("BYOT", google(email))]);
  expect(results.every((r) => !r.err && r.user.role === "BYOT")).toBe(true);
  expect(await User.countDocuments({ email })).toBe(1);
});
it("rejects unverified email and does not link a disabled identity", async () => {
  expect(
    (await signIn("BYOT", { ...google(uniqEmail("unverified")), _json: { email_verified: false } }))
      .err
  ).toBeTruthy();
  const result = await signIn("BYOT", google(b.email));
  expect(result.user.isActive).toBe(false);
  expect((await User.findById(b._id)).googleId).toBeUndefined();
});
it("does not expose BYOT through existing admin lists or metrics", async () => {
  const admin = require("../../src/services/admin.service");
  const trainers = await admin.listTrainers();
  const admins = await admin.listAdmins();
  expect([...trainers, ...admins].some((u) => u.role === "BYOT")).toBe(false);
  const metrics = await admin.getPlatformMetrics();
  expect(metrics.totalClients).toBe(await Client.countDocuments({}));
  expect(metrics.totalTrainers).toBe(await User.countDocuments({ role: "TRAINER" }));
});
it("cannot attach BYOT to a legacy client invitation", async () => {
  const { ClientInvite } = require("../../src/schemas/ClientInvite.schema");
  const trainer = await User.create({
    name: "Trainer",
    role: "TRAINER",
    email: uniqEmail("invite-trainer"),
  });
  const client = await Client.create({ trainerId: trainer._id, name: "Invite", email: a.email });
  const invite = await ClientInvite.create({
    trainerId: trainer._id,
    clientId: client._id,
    clientName: client.name,
    email: a.email,
    inviteToken: "byot-collision",
    expiresAt: new Date(Date.now() + 60000),
  });
  const res = await request(app).post(`/api/auth/invite/${invite.inviteToken}/activate`).send({});
  expect(res.status).toBe(409);
  expect((await Client.findById(client._id)).userId).toBeFalsy();
  expect((await User.findById(a._id)).role).toBe("BYOT");
});

it("rejects a refresh cookie issued before a BYOT account was disabled", async () => {
  const refreshToken = require("../../src/utils/generateRefreshToken")(b._id);
  await User.updateOne({ _id: b._id }, { refreshToken });
  const result = await request(app).post("/api/auth/refresh").set("X-FITOS-CSRF", "1").set("Cookie", `refreshToken=${refreshToken}`);
  expect(result.status).toBe(401);
});
