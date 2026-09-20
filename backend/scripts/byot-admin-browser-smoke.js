/* Isolated synthetic accounts. Real local API/auth and MongoDB; provider bytes mocked.
 * Does not exercise Google or deployment cookies. Start Vite on 127.0.0.1:5181. */
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.ENABLE_GOOGLE_AUTH = "false";
process.env.CLIENT_ORIGIN = "http://127.0.0.1:5181";
process.env.JWT_SECRET = "isolated-admin-browser-access";
process.env.JWT_REFRESH_SECRET = "isolated-admin-browser-refresh";
const launchBrowser = require("./browser-engine");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const sharp = require("sharp");
const bcrypt = require("bcryptjs");
const assert = require("node:assert/strict");
const { randomUUID } = require("crypto");
const { User } = require("../src/schemas/User.schema");
const { ByotProfile } = require("../src/schemas/ByotProfile.schema");
const progress = require("../src/services/byotProgress.service");
const { ByotProgress } = require("../src/schemas/ByotProgress.schema");
const provider = require("../src/services/byotMediaProvider");
const tokenFor = require("../src/utils/generateAccessToken");
const app = require("../src/app");
const output = require("fs").mkdtempSync(
  require("path").join(require("os").tmpdir(), "fitos-admin-byot-")
);
async function contextFor(browser, user, width) {
  const context = await browser.newContext({ viewport: { width, height: 960 } });
  await context.addInitScript(
    (token) => {
      if (!sessionStorage.fixtureSeeded) {
        localStorage.setItem("fitos.accessToken", token);
        sessionStorage.fixtureSeeded = "1";
      }
      window.photoUrls = new Set();
      const create = URL.createObjectURL.bind(URL),
        revoke = URL.revokeObjectURL.bind(URL);
      URL.createObjectURL = (blob) => {
        const url = create(blob);
        window.photoUrls.add(url);
        return url;
      };
      URL.revokeObjectURL = (url) => {
        window.photoUrls.delete(url);
        revoke(url);
      };
    },
    tokenFor(user._id, user.role, user.sessionVersion)
  );
  return context;
}
async function noOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
}
async function confirm(page, action) {
  const handled = new Promise((resolve, reject) =>
    page.once("dialog", (d) => d.accept().then(resolve, reject))
  );
  await action();
  await handled;
}
(async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.init(), ByotProfile.init(), ByotProgress.init()]);
  const server = await new Promise((resolve) => {
    const s = app.listen(5101, () => resolve(s));
  });
  let browser;
  try {
    const jpeg = await sharp({
      create: { width: 200, height: 300, channels: 3, background: "#42667b" },
    })
      .jpeg()
      .toBuffer();
    provider.download = async () => jpeg;
    browser = await launchBrowser();
    for (const width of [1440, 390]) {
      await User.deleteMany({});
      const admin = await User.create({
        name: "Test Admin",
        role: "ADMIN",
        email: `admin-${width}@example.test`,
      });
      const user = await User.create({
        name: "Synthetic Tracker",
        role: "BYOT",
        email: `tracker-${width}@example.test`,
        password: await bcrypt.hash("synthetic-password", 4),
      });
      await User.insertMany(
        Array.from({ length: 22 }, (_, n) => ({
          name: `Other ${n}`,
          email: `other-${width}-${n}@example.test`,
          role: "BYOT",
        }))
      );
      await ByotProfile.create({
        ownerId: user._id,
        timezone: "Asia/Kolkata",
        startingWeightKg: 80,
        checkInAnchorDate: "2026-09-13",
        onboardingCompletedAt: new Date(),
      });
      const today = (await progress.context(user._id)).today;
      await progress.save(
        user._id,
        today,
        { version: 0, measurements: { weightKg: 79 } },
        randomUUID(),
        true
      );
      await ByotProgress.updateOne(
        { ownerId: user._id, date: today },
        {
          "checkin.photos.front": {
            attemptId: randomUUID(),
            publicId: "synthetic-not-a-provider-asset",
            assetId: randomUUID(),
            width: 200,
            height: 300,
            bytes: jpeg.length,
            format: "jpg",
          },
        }
      );
      const ac = await contextFor(browser, admin, width),
        uc = await contextFor(browser, user, width);
      const ap = await ac.newPage(),
        up = await uc.newPage();
      const errors = [];
      ap.on("pageerror", (e) => errors.push(e.message));
      up.on("pageerror", (e) => errors.push(e.message));
      await ap.goto("http://127.0.0.1:5181/admin/byot-users");
      await ap.getByText("Page 1 of 2", { exact: true }).waitFor();
      await ap.getByRole("button", { name: "Next", exact: true }).click();
      await ap.getByText("Page 2 of 2", { exact: true }).waitFor();
      await ap.getByLabel("Search name or email").fill("Synthetic Tracker");
      await ap.getByLabel("Search name or email").press("Enter");
      await ap.getByText("Page 1 of 1", { exact: true }).waitFor();
      await ap.getByRole("heading", { name: "Synthetic Tracker", exact: true }).waitFor();
      await ap.getByText("No activity recorded", { exact: true }).waitFor();
      await noOverflow(ap);
      // Avoid capturing a sticky header midway through CSS smooth scrolling.
      await ap.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await ap.waitForFunction(() => window.scrollY === 0);
      if (width === 390) {
        const header = await ap.locator("header").boundingBox();
        const nav = await ap.getByRole("navigation", { name: "Mobile admin navigation" }).boundingBox();
        assert.ok(nav.y >= header.y + header.height, "Mobile navigation must not overlap the header at scroll top");
      }
      await ap.screenshot({ path: `${output}/admin-${width}.png`, fullPage: true });
      await up.goto("http://127.0.0.1:5181/byot/progress");
      await up
        .getByRole("region", { name: "front photo slot", exact: true })
        .scrollIntoViewIfNeeded();
      await up
        .getByRole("img", { name: `front progress photo on ${today}`, exact: true })
        .first()
        .waitFor();
      assert.ok(await up.evaluate(() => window.photoUrls.size > 0));
      await confirm(ap, () =>
        ap.getByRole("button", { name: "Disable Synthetic Tracker", exact: true }).click()
      );
      await ap.getByRole("button", { name: "Enable Synthetic Tracker", exact: true }).waitFor();
      await up.evaluate(() => window.dispatchEvent(new Event("focus")));
      await up.getByRole("heading", { name: "Be Your Own Trainer", exact: true }).waitFor();
      await up
        .getByText("Your session ended or account access changed. Please sign in again.", {
          exact: true,
        })
        .waitFor();
      assert.equal(await up.evaluate(() => window.photoUrls.size), 0);
      assert.equal(await up.evaluate(() => localStorage.getItem("fitos.accessToken")), null);
      await ap.getByRole("combobox", { name: /Account status/ }).selectOption("disabled");
      await ap.getByRole("button", { name: "Enable Synthetic Tracker", exact: true }).waitFor();
      await confirm(ap, () =>
        ap.getByRole("button", { name: "Enable Synthetic Tracker", exact: true }).click()
      );
      await ap
        .getByText("No BYOT accounts match. Try another search or status filter.", { exact: true })
        .waitFor();
      await up.evaluate(
        (token) => localStorage.setItem("fitos.accessToken", token),
        tokenFor(user._id, user.role)
      );
      await up.reload();
      await up.getByRole("heading", { name: "Be Your Own Trainer", exact: true }).waitFor();
      const login = await uc.request.post("http://localhost:5101/api/auth/login", {
        data: { email: user.email, password: "synthetic-password" },
      });
      assert.equal(login.status(), 200);
      // Exercise the frontend callback hydration with a locally issued session.
      // This is not a Google authorization-code exchange.
      await up.evaluate(
        (token) => {
          window.location.assign(`/auth/google/callback#token=${encodeURIComponent(token)}`);
        },
        (await login.json()).data.accessToken
      );
      for (const name of ["Today’s Workout", "Nutrition Plan", "Progress", "Upcoming Check-in"])
        await up.getByRole("heading", { name, exact: true }).waitFor();
      await noOverflow(up);
      await up.route("**/byot/progress/summary", (route) =>
        route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "Synthetic progress failure" }),
        })
      );
      await up.reload();
      await up.getByText("Synthetic progress failure", { exact: true }).first().waitFor();
      await up.getByRole("heading", { name: "Nutrition Plan", exact: true }).waitFor();
      await up.getByRole("heading", { name: "Today’s Workout", exact: true }).waitFor();
      await up.unroute("**/byot/progress/summary");
      await up.getByRole("button", { name: "Sign out", exact: true }).click();
      await up.getByRole("heading", { name: "Be Your Own Trainer", exact: true }).waitFor();
      assert.deepEqual(errors, []);
      await ac.close();
      await uc.close();
      console.log(
        `PASS ${width}px: admin pagination/search/filter/keyboard/disable/enable, separate BYOT session revoked, blob URLs cleared, old token denied after enable, fresh synthetic login/callback hydration, four Home sections, isolated failure, sign-out and overflow`
      );
    }
    console.log(`Screenshots: ${output}`);
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
    await mongoose.disconnect();
    await mongo.stop();
  }
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
