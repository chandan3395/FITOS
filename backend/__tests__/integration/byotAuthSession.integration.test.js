"use strict";

process.env.ENABLE_GOOGLE_AUTH = "true";

let mockGoogleProfile;
jest.mock("../../src/config/passport", () => ({
  initialize: () => (_req, _res, next) => next(),
  authenticate: (_strategy, options, callback) => (req, res) => {
    if (!callback) return res.status(200).json({ state: options.state });
    return require("../../src/services/googleIdentity.service")(
      req,
      null,
      null,
      mockGoogleProfile,
      (err, user, info) => callback(err, user, info)
    );
  },
}));

const jwt = require("jsonwebtoken");
const request = require("supertest");
const app = require("../../src/app");
const { env } = require("../../src/config/env");
const { User } = require("../../src/schemas/User.schema");
const { ByotProfile } = require("../../src/schemas/ByotProfile.schema");
const { startMemoryMongo, stopMemoryMongo, uniqEmail } = require("./_setup");

jest.setTimeout(120000);

let mongo;
let requestCounter = 20;
const nextIp = () => `127.0.0.${requestCounter++}`;

const profile = (email, id = email) => ({
  id,
  displayName: "BYOT Session Test",
  emails: [{ value: email }],
  _json: { email_verified: true },
});

const cookieValue = (response) => {
  const header = (response.headers["set-cookie"] || []).find((value) =>
    value.startsWith("refreshToken=")
  );
  return header?.split(";")[0] || null;
};

async function googleLogin(agent, googleProfile) {
  mockGoogleProfile = googleProfile;
  const start = await agent
    .get("/api/auth/google?intent=byot")
    .set("X-Forwarded-For", nextIp());
  expect(start.status).toBe(200);
  const callback = await agent.get(
    `/api/auth/google/callback?state=${encodeURIComponent(start.body.state)}&code=mock-provider-code`
  );
  return callback;
}

beforeAll(async () => {
  mongo = await startMemoryMongo();
  await Promise.all([User.init(), ByotProfile.init()]);
});

afterAll(() => stopMemoryMongo(mongo));

describe("BYOT Google session lifecycle", () => {
  it("issues an access token and scoped refresh credential for a first-time BYOT login", async () => {
    const email = uniqEmail("byot-google-new");
    const callback = await googleLogin(request.agent(app), profile(email));

    expect(callback.status).toBe(302);
    expect(callback.headers.location).toMatch(/\/auth\/google\/callback#token=/);
    const refreshHeader = (callback.headers["set-cookie"] || []).find((value) =>
      value.startsWith("refreshToken=")
    );
    expect(refreshHeader).toEqual(expect.stringContaining("HttpOnly"));
    expect(refreshHeader).toEqual(expect.stringContaining("Path=/api/auth"));

    const user = await User.findOne({ email }).select("+refreshToken");
    expect(user.role).toBe("BYOT");
    expect(user.refreshToken).toEqual(expect.any(String));
    expect(await ByotProfile.countDocuments({ ownerId: user._id })).toBe(1);

    const fragment = new URL(callback.headers.location).hash.slice(1);
    const accessToken = new URLSearchParams(fragment).get("token");
    const decodedAccess = jwt.verify(accessToken, env.JWT_SECRET);
    const decodedRefresh = jwt.verify(user.refreshToken, env.JWT_REFRESH_SECRET);
    expect(decodedAccess).toMatchObject({ userId: String(user._id), role: "BYOT" });
    expect(decodedAccess.exp - decodedAccess.iat).toBe(10 * 60);
    expect(decodedRefresh.exp - decodedRefresh.iat).toBe(7 * 24 * 60 * 60);
  });

  it("returns the same account and profile for a returning BYOT Google login", async () => {
    const email = uniqEmail("byot-google-returning");
    const googleProfile = profile(email);
    await googleLogin(request.agent(app), googleProfile);
    const original = await User.findOne({ email });

    const callback = await googleLogin(request.agent(app), googleProfile);
    expect(callback.status).toBe(302);
    expect(await User.countDocuments({ email })).toBe(1);
    expect(String((await User.findOne({ email }))._id)).toBe(String(original._id));
    expect(await ByotProfile.countDocuments({ ownerId: original._id })).toBe(1);
  });

  it.each(["ADMIN", "TRAINER", "CLIENT"])(
    "preserves an existing %s identity and reports a BYOT account collision",
    async (role) => {
      const email = uniqEmail(`byot-collision-${role}`);
      const existing = await User.create({ name: role, email, role });
      const callback = await googleLogin(request.agent(app), profile(email));

      expect(callback.status).toBe(302);
      expect(callback.headers.location).toContain("/byot?error=account_conflict");
      const saved = await User.findById(existing._id);
      expect(saved.role).toBe(role);
      expect(saved.googleId).toBeUndefined();
      expect(await ByotProfile.countDocuments({ ownerId: existing._id })).toBe(0);
    }
  );

  it("refreshes after access expiry, rotates once, and rejects the old credential", async () => {
    const email = uniqEmail("byot-refresh");
    const callback = await googleLogin(request.agent(app), profile(email));
    const firstRefresh = cookieValue(callback);
    const user = await User.findOne({ email });
    const expiredAccess = jwt.sign(
      { userId: user._id, role: "BYOT", sv: user.sessionVersion },
      env.JWT_SECRET,
      { expiresIn: -1 }
    );
    expect(
      (await request(app).get("/api/auth/me").set("Authorization", `Bearer ${expiredAccess}`))
        .status
    ).toBe(401);

    const refreshed = await request(app)
      .post("/api/auth/refresh")
      .set("X-Forwarded-For", nextIp())
      .set("X-FITOS-CSRF", "1")
      .set("Cookie", firstRefresh);
    expect(refreshed.status).toBe(200);
    expect(
      (
        await request(app)
          .get("/api/auth/me")
          .set("Authorization", `Bearer ${refreshed.body.data.accessToken}`)
      ).status
    ).toBe(200);
    const rotatedRefresh = cookieValue(refreshed);
    expect(rotatedRefresh).toBeTruthy();
    expect(rotatedRefresh).not.toBe(firstRefresh);
    expect(
      (
        await request(app)
          .post("/api/auth/refresh")
          .set("X-Forwarded-For", nextIp())
          .set("X-FITOS-CSRF", "1")
          .set("Cookie", firstRefresh)
      ).status
    ).toBe(401);
  });

  it("rejects expired and revoked refresh credentials", async () => {
    const user = await User.create({ name: "Expired", email: uniqEmail("expired"), role: "BYOT" });
    const expired = jwt.sign(
      { userId: user._id, sv: user.sessionVersion },
      env.JWT_REFRESH_SECRET,
      { expiresIn: -1, jwtid: "expired-refresh" }
    );
    await User.updateOne({ _id: user._id }, { refreshToken: expired });
    const expiredResult = await request(app)
      .post("/api/auth/refresh")
      .set("X-Forwarded-For", nextIp())
      .set("X-FITOS-CSRF", "1")
      .set("Cookie", `refreshToken=${expired}`);
    expect(expiredResult.status).toBe(401);

    const revoked = require("../../src/utils/generateRefreshToken")(user._id, user.sessionVersion);
    await User.updateOne({ _id: user._id }, { refreshToken: null });
    const revokedResult = await request(app)
      .post("/api/auth/refresh")
      .set("X-Forwarded-For", nextIp())
      .set("X-FITOS-CSRF", "1")
      .set("Cookie", `refreshToken=${revoked}`);
    expect(revokedResult.status).toBe(401);
  });

  it("blocks a disabled BYOT account at Google callback, refresh, and bearer authentication", async () => {
    const email = uniqEmail("byot-disabled");
    const googleProfile = profile(email);
    const initial = await googleLogin(request.agent(app), googleProfile);
    const refresh = cookieValue(initial);
    const user = await User.findOne({ email });
    await User.updateOne(
      { _id: user._id },
      { isActive: false, refreshToken: null, $inc: { sessionVersion: 1 } }
    );

    const callback = await googleLogin(request.agent(app), googleProfile);
    expect(callback.headers.location).toContain("/account-disabled");
    expect(
      (
        await request(app)
          .post("/api/auth/refresh")
          .set("X-Forwarded-For", nextIp())
          .set("X-FITOS-CSRF", "1")
          .set("Cookie", refresh)
      ).status
    ).toBe(401);

    const staleAccess = new URLSearchParams(new URL(initial.headers.location).hash.slice(1)).get(
      "token"
    );
    expect(
      (await request(app).get("/api/auth/me").set("Authorization", `Bearer ${staleAccess}`))
        .status
    ).toBe(401);
  });
});
