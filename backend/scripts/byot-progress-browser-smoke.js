/* Browser fixture: isolated MongoDB, synthetic images and mocked Cloudinary I/O.
 * Provider privacy is checked separately by byot-cloudinary-live-smoke.js.
 * Start Vite on 127.0.0.1:5181 with VITE_API_URL=http://localhost:5101/api. */
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.ENABLE_GOOGLE_AUTH = "false";
process.env.CLIENT_ORIGIN = "http://127.0.0.1:5181";
process.env.JWT_SECRET = "isolated-progress-browser-access";
process.env.JWT_REFRESH_SECRET = "isolated-progress-browser-refresh";
const launchBrowser = require("./browser-engine");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const sharp = require("sharp");
const assert = require("node:assert/strict");
const { randomUUID } = require("crypto");
const path = require("path");
const output = require("fs").mkdtempSync(path.join(require("os").tmpdir(), "fitos-progress-"));
const { User } = require("../src/schemas/User.schema");
const { ByotProfile } = require("../src/schemas/ByotProfile.schema");
const {
  ByotProgress: Progress,
  ByotPhotoAttempt: Attempt,
  ByotPhotoBudget: Budget,
} = require("../src/schemas/ByotProgress.schema");
const provider = require("../src/services/byotMediaProvider");
const progress = require("../src/services/byotProgress.service");
const photos = require("../src/services/byotPhoto.service");
const clock = require("../src/utils/byotClock");
const tokenFor = require("../src/utils/generateAccessToken");
const app = require("../src/app");
let now;
clock.now = () => new Date(now);
const assets = new Map();
provider.configured = () => {};
provider.upload = async (publicId, bytes) => {
  const meta = await sharp(bytes).metadata();
  const value = {
    public_id: publicId,
    type: "authenticated",
    resource_type: "image",
    format: "jpg",
    asset_id: randomUUID(),
    bytes: bytes.length,
    width: meta.width,
    height: meta.height,
    buffer: bytes,
  };
  assets.set(publicId, value);
  return value;
};
provider.inspect = async (id) => {
  if (!assets.has(id)) throw Error("Missing synthetic asset");
  return assets.get(id);
};
provider.destroy = async (id) => assets.delete(id);
provider.download = async (photo, thumbnail) =>
  thumbnail
    ? sharp(assets.get(photo.publicId).buffer)
        .resize({ width: 360, height: 360, fit: "inside" })
        .jpeg()
        .toBuffer()
    : assets.get(photo.publicId).buffer;
const b = (page, name) => page.getByRole("button", { name, exact: true });
async function overflow(page) {
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
    "Horizontal overflow"
  );
}
async function saved(page, name = "Save measurements") {
  await b(page, name).click();
  await page.getByText("Progress saved.", { exact: true }).waitFor();
}
(async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([Progress.init(), Attempt.init(), Budget.init(), ByotProfile.init()]);
  const server = await new Promise((resolve) => {
    const s = app.listen(5101, () => resolve(s));
  });
  let browser;
  try {
    browser = await launchBrowser();
    const jpeg = await sharp({
      create: { width: 400, height: 600, channels: 3, background: "#42667b" },
    })
      .jpeg()
      .toBuffer();
    for (const width of [1440, 390]) {
      now = "2026-09-20T12:00:00Z";
      const user = await User.create({
        name: "Progress Test",
        email: `progress-${width}@example.test`,
        role: "BYOT",
      });
      await ByotProfile.create({
        ownerId: user._id,
        timezone: "Asia/Kolkata",
        startingWeightKg: 80,
        targetWeightKg: 75,
        checkInAnchorDate: "2026-09-13",
        onboardingCompletedAt: new Date(),
      });
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        extraHTTPHeaders: { "X-Forwarded-For": width === 1440 ? "127.0.0.2" : "127.0.0.3" },
      });
      await context.addInitScript(
        (token) => localStorage.setItem("fitos.accessToken", token),
        tokenFor(user)
      );
      const page = await context.newPage();
      await page.clock.setFixedTime(new Date(now));
      const errors = [];
      page.on("pageerror", (err) => errors.push(err.message));
      await page.goto("http://127.0.0.1:5181/byot/progress");
      await page.getByLabel("Progress date", { exact: true }).waitFor();
      await page.getByLabel("Weight (kg)", { exact: true }).fill("79.5");
      await page.getByLabel("Waist (cm)", { exact: true }).fill("82");
      await page.getByLabel("Weight (kg)", { exact: true }).focus();
      const keyboardSave = page.waitForResponse(
        (r) => r.request().method() === "PUT" && r.url().includes("/progress/records/")
      );
      await page.keyboard.press("Enter");
      assert.equal((await keyboardSave).status(), 200);
      await page.getByRole("region", { name: "Weight history graph" }).getByRole("img").waitFor();
      await page.getByLabel("Weight (kg)", { exact: true }).fill("79.2");
      await saved(page);
      await overflow(page);
      await saved(page, "Save check-in draft");
      const uploadSlot = async (slot) => {
        const section = page.getByRole("region", { name: `${slot} photo slot`, exact: true });
        await section
          .locator('input[type="file"]')
          .setInputFiles({ name: `${slot}.jpg`, mimeType: "image/jpeg", buffer: jpeg });
        await b(section, `Upload ${slot}`).click();
        await section.getByText("Photo saved and verified.", { exact: true }).waitFor();
      };
      await uploadSlot("front");
      await page.reload();
      await page.getByText("Draft — incomplete", { exact: true }).waitFor();
      await page
        .getByRole("region", { name: "front photo slot", exact: true })
        .scrollIntoViewIfNeeded();
      await page
        .getByRole("region", { name: "front photo slot", exact: true })
        .getByRole("img")
        .waitFor();
      await uploadSlot("side");
      await uploadSlot("back");
      await b(page, "Complete personal check-in").click();
      await page.getByText("Personal check-in completed.", { exact: true }).waitFor();
      await page.getByRole("link", { name: "Home", exact: true }).click();
      await page.getByText("Your next check-in is on 2026-09-27.", { exact: true }).waitFor();
      await page.getByText("Latest completed check-in: 2026-09-20", { exact: true }).waitFor();
      await overflow(page);
      await page.screenshot({ path: path.join(output, `home-${width}.png`), fullPage: true });
      await page.getByRole("link", { name: "Progress", exact: true }).click();
      await page.getByLabel("Progress date", { exact: true }).fill("2026-09-13");
      await page.getByLabel("Weight (kg)", { exact: true }).fill("80");
      await saved(page, "Save check-in draft");
      for (const s of ["front", "side", "back"]) await uploadSlot(s);
      await b(page, "Complete personal check-in").click();
      await page.getByText("Personal check-in completed.", { exact: true }).waitFor();
      await page.getByText("Your next check-in is on 2026-09-27.", { exact: true }).waitFor();
      const comparison = page.getByRole("region", { name: "Photo comparison", exact: true });
      await comparison.getByLabel("Comparison date 1").selectOption("2026-09-13");
      await comparison.getByLabel("Comparison date 2").selectOption("2026-09-20");
      // Real concurrent thumbnail loads can fill the four-download capacity cap.
      // Exercise the visible retry action deterministically, without raising caps.
      await page.route("**/progress/checkins/*/photos/front/original", route => route.fulfill({
        status: 503, headers: { "Retry-After": "5" }, contentType: "application/json",
        body: JSON.stringify({ message: "Synthetic media capacity reached" }),
      }), { times: 1 });
      for (const slot of ["front", "side", "back"]) {
        await comparison.getByLabel("Orientation").selectOption(slot);
        await b(comparison, "View comparison").click();
        for (const [index, date] of ["2026-09-13", "2026-09-20"].entries()) {
          const card = comparison.locator(".grid.grid-cols-2 > div").nth(index);
          const photo = card.getByRole("img", { name: `${slot} progress photo on ${date}`, exact: true });
          const retry = card.getByRole("button", { name: `Retry ${slot} photo`, exact: true });
          await photo.or(retry).first().waitFor();
          if (await retry.isVisible()) {
            await page.waitForTimeout(5100); // Honour the bounded service's Retry-After.
            await retry.click();
          }
          await photo.waitFor();
        }
        assert.equal(await comparison.getByRole("img").count(), 2);
      }
      await overflow(page);
      await page.screenshot({ path: path.join(output, `progress-${width}.png`), fullPage: true });
      await page
        .getByRole("region", { name: "Weight history graph", exact: true })
        .screenshot({ path: path.join(output, `graph-${width}.png`) });
      await comparison.screenshot({ path: path.join(output, `comparison-${width}.png`) });
      await page.getByLabel("Progress date", { exact: true }).fill("2026-09-20");
      const front = page.getByRole("region", { name: "front photo slot", exact: true });
      await front
        .locator('input[type="file"]')
        .setInputFiles({ name: "replace.jpg", mimeType: "image/jpeg", buffer: jpeg });
      const old = (await progress.read(user._id, "2026-09-20")).checkin.photos.front.id;
      await page.route(
        "**/progress/uploads/*/content",
        (route) =>
          route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ message: "Synthetic upload failure" }),
          }),
        { times: 1 }
      );
      await b(front, "Upload front").click();
      await front.getByRole("status").filter({ hasText: "Synthetic upload failure" }).waitFor();
      assert.equal((await progress.read(user._id, "2026-09-20")).checkin.photos.front.id, old);
      await b(front, "Retry front upload").click();
      await front.getByText("Photo saved and verified.", { exact: true }).waitFor();
      assert.notEqual((await progress.read(user._id, "2026-09-20")).checkin.photos.front.id, old);
      page.once("dialog", (d) => d.accept());
      await b(front, "Remove front photo").click();
      await page.getByText("Draft — incomplete", { exact: true }).waitFor();
      await page.getByText("Your check-in is due today.", { exact: true }).waitFor();
      await photos.cleanup(100);
      assert.equal(
        assets.has((await Attempt.findOne({ ownerId: user._id, id: old })).publicId),
        false
      );
      await page.getByLabel("Weight (kg)", { exact: true }).fill("78.8");
      const current = await progress.read(user._id, "2026-09-20");
      await progress.save(
        user._id,
        current.date,
        {
          version: current.version,
          measurements: { weightKg: 79 },
          notes: "Concurrent correction",
        },
        randomUUID()
      );
      await b(page, "Save measurements").click();
      await page.getByRole("alert").filter({ hasText: "A newer version was saved" }).waitFor();
      assert.equal(await page.getByLabel("Weight (kg)", { exact: true }).inputValue(), "78.8");
      const discardedNavigation = new Promise((resolve, reject) => {
        page.once("dialog", (d) => d.dismiss().then(resolve, reject));
      });
      await page.getByRole("link", { name: "Home", exact: true }).click();
      await discardedNavigation;
      assert.ok(page.url().endsWith("/byot/progress"));
      page.once("dialog", (d) => d.accept());
      await b(page, "Reload saved progress").click();
      await page.waitForFunction(
        () => document.querySelector('input[type="number"]').value === "79"
      );
      page.once("dialog", (d) => d.accept());
      await b(page, "Delete check-in and photos").click();
      await page.getByText("Not started", { exact: true }).waitFor();
      assert.equal((await progress.read(user._id, "2026-09-20")).measurements.weightKg, 79);
      page.once("dialog", (d) => d.accept());
      await b(page, "Delete measurements").click();
      await page.getByText("Progress saved.", { exact: true }).waitFor();
      await photos.cleanup(100);
      await page.getByRole("link", { name: "Home", exact: true }).click();
      await page.getByRole("heading", { name: "Nutrition Plan", exact: true }).waitFor();
      await page.getByRole("heading", { name: "Today’s Workout", exact: true }).waitFor();
      now = "2026-09-20T18:30:01Z";
      await page.clock.setFixedTime(new Date(now));
      await page
        .getByText("You missed your check-in on 2026-09-20. Please check in.", { exact: true })
        .waitFor();
      await overflow(page);
      // Expired previously valid session: active-account guard plus normal refresh failure clears UI.
      await User.updateOne({ _id: user._id }, { isActive: false });
      await page.getByRole("link", { name: "Progress", exact: true }).click();
      await page.getByRole("heading", { name: "Be Your Own Trainer", exact: true }).waitFor();
      assert.deepEqual(errors, []);
      await context.close();
      const expiredContext = await browser.newContext({ viewport: { width, height: 900 } });
      const expiredToken = require("jsonwebtoken").sign(
        { userId: String(user._id), role: "BYOT" },
        process.env.JWT_SECRET,
        { expiresIn: -60 }
      );
      await expiredContext.addInitScript(
        (token) => localStorage.setItem("fitos.accessToken", token),
        expiredToken
      );
      const expiredPage = await expiredContext.newPage();
      await expiredPage.goto("http://127.0.0.1:5181/byot/progress");
      await expiredPage
        .getByRole("heading", { name: "Be Your Own Trainer", exact: true })
        .waitFor();
      await expiredContext.close();
      console.log(
        `PASS ${width}px: measurements/graph/history, draft resume, three-photo completion, Home/schedule, comparisons, replacement failure/retry, removal/cleanup, conflicts/discard, midnight, disabled session and no overflow`
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
