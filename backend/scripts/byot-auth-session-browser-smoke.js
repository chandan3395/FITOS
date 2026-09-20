/* Production code in a local browser: expired BYOT access tokens are refreshed
 * automatically through the same-origin /api proxy. Google itself is mocked
 * only by pre-issuing the already-tested server session credentials. */
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.ENABLE_GOOGLE_AUTH = "false";
process.env.CLIENT_ORIGIN = "http://127.0.0.1:5173";
process.env.JWT_SECRET = "byot-browser-access-secret";
process.env.JWT_REFRESH_SECRET = "byot-browser-refresh-secret";

const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const launchBrowser = require("./browser-engine");
const { User } = require("../src/schemas/User.schema");
const { ByotProfile } = require("../src/schemas/ByotProfile.schema");
const generateRefreshToken = require("../src/utils/generateRefreshToken");
const app = require("../src/app");

const expiredAccess = (user) =>
  jwt.sign(
    { userId: user._id, role: user.role, sv: user.sessionVersion },
    process.env.JWT_SECRET,
    { expiresIn: -1 }
  );

async function createSession(label) {
  const user = await User.create({
    name: `Session ${label}`,
    email: `session-${label}@example.test`,
    role: "BYOT",
  });
  await ByotProfile.create({
    ownerId: user._id,
    startingWeightKg: 75,
    heightCm: 175,
    goal: "Track consistently",
    timezone: "Asia/Kolkata",
    checkInAnchorDate: "2026-09-13",
    onboardingCompletedAt: new Date(),
  });
  const refreshToken = generateRefreshToken(user._id, user.sessionVersion);
  await User.updateOne({ _id: user._id }, { refreshToken });
  return { user, refreshToken };
}

async function contextFor(browser, session) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addCookies([
    {
      name: "refreshToken",
      value: session.refreshToken,
      domain: "127.0.0.1",
      path: "/api/auth",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    },
  ]);
  await context.addInitScript(
    (token) => localStorage.setItem("fitos.accessToken", token),
    expiredAccess(session.user)
  );
  return context;
}

(async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.init(), ByotProfile.init()]);
  const server = await new Promise((resolve) => {
    const listening = app.listen(5000, () => resolve(listening));
  });
  let browser;
  try {
    browser = await launchBrowser();

    const automatic = await createSession("automatic");
    const automaticContext = await contextFor(browser, automatic);
    const automaticPage = await automaticContext.newPage();
    automaticPage.on("pageerror", (error) => console.error("PAGE ERROR", error.message));
    automaticPage.on("response", (response) => {
      if (response.url().includes("/api/auth/"))
        console.log(`AUTH ${response.status()} ${new URL(response.url()).pathname}`);
    });
    await automaticPage.goto("http://127.0.0.1:5173/byot/dashboard");
    await automaticPage.getByRole("heading", { name: "Home", exact: true }).waitFor();
    const rotated = await User.findById(automatic.user._id).select("+refreshToken");
    assert.notEqual(rotated.refreshToken, automatic.refreshToken);
    const restoredAccess = await automaticPage.evaluate(() =>
      localStorage.getItem("fitos.accessToken")
    );
    assert.ok(jwt.verify(restoredAccess, process.env.JWT_SECRET).exp * 1000 > Date.now());
    await automaticPage.reload();
    await automaticPage.getByRole("heading", { name: "Home", exact: true }).waitFor();
    await automaticContext.close();

    const recoverable = await createSession("recoverable");
    const recoverableContext = await contextFor(browser, recoverable);
    const recoverablePage = await recoverableContext.newPage();
    recoverablePage.on("pageerror", (error) => console.error("PAGE ERROR", error.message));
    recoverablePage.on("response", (response) => {
      if (response.url().includes("/api/auth/"))
        console.log(`RECOVERY AUTH ${response.status()} ${new URL(response.url()).pathname}`);
    });
    await recoverablePage.route("**/api/auth/refresh", (route) =>
      route.fulfill({ status: 503, contentType: "application/json", body: "{}" })
    );
    await recoverablePage.goto("http://127.0.0.1:5173/byot/dashboard");
    await recoverablePage
      .getByRole("heading", { name: "Session temporarily unavailable", exact: true })
      .waitFor();
    assert.ok(await recoverablePage.evaluate(() => localStorage.getItem("fitos.accessToken")));
    await recoverablePage.unroute("**/api/auth/refresh");
    await recoverablePage.getByRole("button", { name: "Try again", exact: true }).click();
    await recoverablePage.getByRole("heading", { name: "Home", exact: true }).waitFor();
    await recoverableContext.close();

    console.log(
      "PASS: expired access auto-refreshes and rotates; reload stays signed in; transient refresh failure preserves the session and retry recovers"
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
