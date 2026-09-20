process.env.ENABLE_GOOGLE_AUTH = "true";
jest.mock("../../src/config/passport", () => ({
  initialize: () => (_req, _res, next) => next(),
  authenticate: jest.fn((_strategy, options, callback) => (req, res) => {
    if (callback) return callback(null, false);
    return res.json({ state: options.state });
  }),
}));
const request = require("supertest");
const app = require("../../src/app");
const passport = require("../../src/config/passport");
const { OAuthState } = require("../../src/utils/oauthState");
const { startMemoryMongo, stopMemoryMongo } = require("./_setup");
jest.setTimeout(120000);
let db;
beforeAll(async () => {
  db = await startMemoryMongo();
  await OAuthState.init();
});
afterAll(() => stopMemoryMongo(db));
it("consumes browser state before Passport can exchange a code or create an identity", async () => {
  const agent = request.agent(app);
  const start = await agent.get("/api/auth/google?intent=byot");
  expect(start.status).toBe(200);
  passport.authenticate.mockClear();
  const invalid = await agent.get("/api/auth/google/callback?state=forged&code=never-exchange");
  expect(invalid.headers.location).toContain("error=invalid_state");
  expect(passport.authenticate).not.toHaveBeenCalled();
  // An invalid attempt clears the browser binding; start a fresh flow.
  const fresh = await agent.get("/api/auth/google?intent=byot");
  passport.authenticate.mockClear();
  const wrongBrowser = await request(app).get(
    `/api/auth/google/callback?state=${fresh.body.state}`
  );
  expect(wrongBrowser.headers.location).toContain("error=invalid_state");
  expect(passport.authenticate).not.toHaveBeenCalled();
  const valid = await agent.get(`/api/auth/google/callback?state=${fresh.body.state}`);
  expect(valid.headers.location).toContain("/byot?error=google_failed");
  expect(passport.authenticate).toHaveBeenCalledTimes(1);
  const replay = await agent.get(`/api/auth/google/callback?state=${fresh.body.state}`);
  expect(replay.headers.location).toContain("error=invalid_state");
  expect(passport.authenticate).toHaveBeenCalledTimes(1);
});
