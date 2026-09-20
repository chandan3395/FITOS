// Production-bundle UI fixture. Disposable Mongo, synthetic data/images only.
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.ENABLE_GOOGLE_AUTH = "false";
process.env.CLIENT_ORIGIN = "http://127.0.0.1:5181";
process.env.JWT_SECRET = "synthetic-layout-access";
process.env.JWT_REFRESH_SECRET = "synthetic-layout-refresh";
const { createRequire } = require("node:module");
const path = require("node:path"), fs = require("node:fs"), assert = require("node:assert/strict");
const backend = createRequire(path.resolve("backend/package.json"));
const { randomUUID: id } = require("node:crypto");
const { MongoMemoryServer } = backend("mongodb-memory-server"), mongoose = backend("mongoose");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { User } = backend("./src/schemas/User.schema");
const { ByotProfile } = backend("./src/schemas/ByotProfile.schema");
const { ByotNutritionPlan, ByotFoodLog } = backend("./src/schemas/ByotNutrition.schema");
const { ByotWorkoutRoutine } = backend("./src/schemas/ByotWorkout.schema");
const { ByotProgress } = backend("./src/schemas/ByotProgress.schema");
const tokenFor = backend("./src/utils/generateAccessToken");
backend("./src/utils/byotClock").now = () => new Date("2026-09-20T12:00:00Z");
const app = backend("./src/app");
const output = path.resolve("docs/byot-layout-review");
fs.mkdirSync(output, { recursive: true });
(async () => {
  const mongo = await MongoMemoryServer.create(); await mongoose.connect(mongo.getUri());
  const server = await new Promise(resolve => { const s = app.listen(5101, () => resolve(s)); });
  let browser;
  try {
    const user = await User.create({ name: "Alex Morgan", email: "alex@example.test", role: "BYOT" });
    const ownerId = user._id;
    await ByotProfile.create({ ownerId, startingWeightKg: 80, targetWeightKg: 76, heightCm: 178,
      goal: "Build consistency", timezone: "Asia/Kolkata", checkInAnchorDate: "2026-08-23", onboardingCompletedAt: new Date() });
    const meals = () => [
      { id: id(), name: "Breakfast", foods: [{ id: id(), name: "Oats, yogurt and berries", quantity: "1 bowl", calories: 420, protein: 24, carbs: 58, fats: 11 }] },
      { id: id(), name: "Lunch", foods: [{ id: id(), name: "Rice and grilled chicken", quantity: "1 plate", calories: 580, protein: 42, carbs: 65, fats: 15 }] },
    ];
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const target = { calories: 2200, protein: 130, carbs: 260, fats: 70 };
    await ByotNutritionPlan.create({ ownerId, version: 1, days: days.map(day => ({ day, meals: meals(), target })) });
    await ByotFoodLog.create({ ownerId, version: 1, date: "2026-09-20", timezoneAtCreation: "Asia/Kolkata", target, targetSource: "current", meals: meals() });
    await ByotWorkoutRoutine.create({ ownerId, version: 1, name: "Weekly strength", days: days.map(day => ({ day, kind: "workout", label: "Full body", exercises: ["Squat", "Push-up", "Dumbbell row", "Reverse lunge", "Plank"].map(name => ({ id: id(), name, sets: 3, reps: "8–12", weightKg: 0, restSeconds: 60, notes: "" })) })) });
    const jpeg = await backend("sharp")({ create: { width: 400, height: 600, channels: 3, background: "#64748b" } }).jpeg().toBuffer();
    backend("./src/services/byotMediaProvider").download = async () => jpeg;
    for (const [index, date] of ["2026-08-23", "2026-08-30", "2026-09-06", "2026-09-13", "2026-09-20"].entries()) {
      const photo = () => ({ attemptId: id(), publicId: "synthetic-only", assetId: id(), bytes: jpeg.length, width: 400, height: 600, format: "jpg" });
      await ByotProgress.create({ ownerId, version: 1, date, timezoneAtCreation: "Asia/Kolkata", measurements: { weightKg: 80 - index * .4, waistCm: 84 - index * .3 }, notes: "Weekly personal record", checkin: { active: true, completedAt: new Date(`${date}T12:00:00Z`), photos: { front: photo(), side: photo(), back: photo() } } });
    }
    browser = await chromium.launch({ channel: "msedge", headless: true });
    for (const width of [1440, 1920, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce", extraHTTPHeaders: { "X-Forwarded-For": `127.0.0.${width === 390 ? 31 : width === 1440 ? 32 : 33}` } });
      await context.route("https://fonts.googleapis.com/**", route => route.abort());
      await context.route("https://fonts.gstatic.com/**", route => route.abort());
      await context.addInitScript(token => localStorage.setItem("fitos.accessToken", token), tokenFor(user));
      const page = await context.newPage(); await page.clock.setFixedTime(new Date("2026-09-20T12:00:00Z"));
      for (const [name, route] of [["Home", "dashboard"], ["Nutrition", "nutrition"], ["Progress", "progress"], ["Workout", "workout"]]) {
        if (name === "Home") await page.goto(`http://127.0.0.1:5181/byot/${route}`);
        else await page.getByRole("navigation", { name: "BYOT navigation" }).getByRole("link", { name, exact: true }).click();
        await page.getByRole("heading", { name, exact: true, level: 1 }).waitFor();
        await page.waitForTimeout(800);
        assert.equal(await page.getByRole("navigation").getByRole("link", { name, exact: true }).getAttribute("aria-current"), "page");
        const geometry = await page.evaluate(() => {
          const main = document.querySelector("#byot-main"), aside = document.querySelector("aside"), content = document.querySelector(".byot-content");
          return { overflow: main.scrollWidth > main.clientWidth || document.documentElement.scrollWidth > innerWidth, x: main.getBoundingClientRect().x, fixed: getComputedStyle(aside).position, content: content.getBoundingClientRect().width };
        });
        assert.equal(geometry.overflow, false); assert.ok(geometry.content <= 1200);
        if (width >= 768) { assert.equal(geometry.fixed, "fixed"); assert.ok(geometry.x >= 256); }
        await page.screenshot({ path: path.join(output, `${route}-${width}.png`) });
        if (name === "Nutrition") {
          const before = await page.locator("aside").boundingBox();
          await page.locator("#byot-main").evaluate(main => main.scrollTo({ top: main.scrollHeight, behavior: "instant" }));
          assert.ok(await page.locator("#byot-main").evaluate(main => main.scrollTop > 0));
          assert.equal(await page.evaluate(() => window.scrollY), 0);
          assert.deepEqual(await page.locator("aside").boundingBox(), before);
          await page.screenshot({ path: path.join(output, `sidebar-scrolled-${width}.png`) });
        }
        await page.reload(); await page.getByRole("heading", { name, exact: true, level: 1 }).waitFor();
      }
      await page.goBack(); await page.getByRole("heading", { name: "Progress", exact: true, level: 1 }).waitFor();
      assert.equal(await page.getByRole("navigation").getByRole("link", { name: "Progress", exact: true }).getAttribute("aria-current"), "page");
      await page.goForward(); await page.getByRole("heading", { name: "Workout", exact: true, level: 1 }).waitFor();
      await page.getByRole("button", { name: "Edit routine", exact: true }).click();
      await page.getByLabel("Routine name", { exact: true }).waitFor();
      const nutritionLink = page.getByRole("navigation").getByRole("link", { name: "Nutrition", exact: true });
      await nutritionLink.focus(); await page.keyboard.press("Enter");
      await page.getByLabel("Meal name", { exact: true }).first().fill(`Morning meal ${width}`);
      await page.getByRole("button", { name: "Save changes", exact: true }).click();
      await page.getByText("Daily log saved. Your food counts immediately.", { exact: true }).waitFor();
      console.log(`PASS ${width}px: four routes, fixed sidebar/main-only scrolling, width cap, overflow, keyboard navigation, refresh, back/forward, header actions`);
      await context.close();
    }
    console.log(`Screenshots: ${output}`);
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); await mongoose.disconnect(); await mongo.stop(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
