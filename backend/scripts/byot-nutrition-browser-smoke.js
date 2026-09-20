/* Run Vite at 127.0.0.1:5181 with VITE_API_URL=http://localhost:5101/api.
 * Uses an isolated MongoDB, generated test sessions and optional external
 * PLAYWRIGHT_MODULE. No Google OAuth or deployed cookies are tested here. */
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.ENABLE_GOOGLE_AUTH = "false";
process.env.CLIENT_ORIGIN = "http://127.0.0.1:5181";
process.env.JWT_SECRET = "isolated-nutrition-browser-test-access";
process.env.JWT_REFRESH_SECRET = "isolated-nutrition-browser-test-refresh";
const launchBrowser = require("./browser-engine");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const assert = require("node:assert/strict");
const path = require("node:path");
const output = require("node:fs").mkdtempSync(
  path.join(require("node:os").tmpdir(), "fitos-nutrition-")
);
const { User } = require("../src/schemas/User.schema");
const { ByotProfile } = require("../src/schemas/ByotProfile.schema");
const { ByotNutritionPlan, ByotFoodLog } = require("../src/schemas/ByotNutrition.schema");
const nutrition = require("../src/services/byotNutrition.service");
const tokenFor = require("../src/utils/generateAccessToken");
const app = require("../src/app");
async function fillFood(section, index, name, calories, protein = "0", carbs = "0", fats = "0") {
  const food = section.locator("fieldset").nth(index);
  await food.getByLabel("Food name", { exact: true }).fill(name);
  await food.getByLabel("Quantity / serving", { exact: true }).fill("1 serving");
  for (const [label, value] of [
    ["Calories (kcal)", calories],
    ["Protein (g)", protein],
    ["Carbs (g)", carbs],
    ["Fats (g)", fats],
  ])
    await food.getByLabel(label, { exact: true }).fill(value);
}
const meal = (page, i) => page.getByRole("region", { name: `Meal ${i}`, exact: true });
async function noOverflow(page) {
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
    "horizontal overflow"
  );
}
async function saved(page, type) {
  await page
    .getByRole("button", {
      name: type === "plan" ? "Save weekly plan" : "Save daily log",
      exact: true,
    })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: type === "plan" ? "Weekly plan saved." : "Daily log saved." })
    .waitFor();
}
(async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([ByotProfile.init(), ByotNutritionPlan.init(), ByotFoodLog.init()]);
  const server = await new Promise((resolve) => {
    const s = app.listen(5101, () => resolve(s));
  });
  let browser;
  try {
    browser = await launchBrowser();
    for (const width of [1440, 390]) {
      const user = await User.create({
        name: "Nutrition Test",
        email: `nutrition-${width}@example.test`,
        role: "BYOT",
      });
      await ByotProfile.create({
        ownerId: user._id,
        timezone: "Asia/Kolkata",
        onboardingCompletedAt: new Date(),
        checkInAnchorDate: "2026-09-19",
      });
      const { today, weekday } = await nutrition.context(user._id);
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(
        (token) => localStorage.setItem("fitos.accessToken", token),
        tokenFor(user)
      );
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (err) => errors.push(err.message));
      await page.goto("http://127.0.0.1:5181/byot/nutrition");
      await page.getByLabel("Log date", { exact: true }).waitFor();
      assert.equal(await page.getByLabel("Log date", { exact: true }).inputValue(), today);
      await page.getByRole("button", { name: /^Weekly Plan/ }).click();
      await page.getByLabel("Calories target (kcal)").fill("300");
      await page.getByRole("button", { name: "Add meal", exact: true }).click();
      await meal(page, 1).getByLabel("Meal name", { exact: true }).fill("Snack");
      await fillFood(meal(page, 1), 0, "Oats", "150.25", "10.5", "20.25", "3.5");
      await meal(page, 1).getByRole("button", { name: "Add food", exact: true }).click();
      await fillFood(meal(page, 1), 1, "Banana", "100", "1.5", "23", "0.5");
      await page.getByRole("button", { name: "Add meal", exact: true }).click();
      await meal(page, 2).getByLabel("Meal name", { exact: true }).fill("Snack");
      await fillFood(meal(page, 2), 0, "Nuts", "50", "2", "5", "1");
      await page.getByRole("button", { name: "Move meal 2 up", exact: true }).click();
      const destination = weekday === "tuesday" ? "wednesday" : "tuesday";
      await page.getByLabel("Copy this day to").selectOption(destination);
      await page.getByRole("button", { name: "Copy day’s meals", exact: true }).click();
      await noOverflow(page);
      await saved(page, "plan");
      const plan = await ByotNutritionPlan.findOne({ ownerId: user._id }).lean();
      const source = plan.days.find((day) => day.day === weekday);
      const copied = plan.days.find((day) => day.day === destination);
      assert.notEqual(source.meals[0].id, copied.meals[0].id);
      assert.notEqual(source.meals[0].foods[0].id, copied.meals[0].foods[0].id);
      await page.reload();
      await page.getByLabel("Log date", { exact: true }).waitFor();
      await page.getByRole("button", { name: /^Weekly Plan/ }).click();
      assert.equal(
        await meal(page, 1).getByLabel("Food name", { exact: true }).inputValue(),
        "Nuts"
      );
      await page.screenshot({ path: path.join(output, `weekly-${width}.png`), fullPage: true });
      await page.getByRole("button", { name: /^Daily Log/ }).click();
      await page.getByRole("button", { name: "Copy Snack (2) to log", exact: true }).click();
      await saved(page, "log");
      await meal(page, 1).getByLabel("Calories (kcal)", { exact: true }).first().fill("200.5");
      await saved(page, "log");
      await page.getByText("0.5 kcal over target", { exact: true }).waitFor();
      await page.getByRole("button", { name: "Add meal", exact: true }).click();
      await meal(page, 2).getByLabel("Meal name", { exact: true }).fill("Unplanned meal");
      await fillFood(meal(page, 2), 0, "Extra fruit", "25.5");
      await saved(page, "log");
      await page.getByText("326 kcal logged", { exact: true }).waitFor();
      await noOverflow(page);
      await page.screenshot({ path: path.join(output, `daily-${width}.png`), fullPage: true });
      await page.getByRole("button", { name: /^Weekly Plan/ }).click();
      await meal(page, 2).getByLabel("Calories (kcal)", { exact: true }).first().fill("999");
      await saved(page, "plan");
      await page.getByRole("button", { name: /^Daily Log/ }).click();
      await page.getByText("326 kcal logged", { exact: true }).waitFor();
      assert.equal(
        await meal(page, 1).getByLabel("Calories (kcal)", { exact: true }).first().inputValue(),
        "200.5"
      );
      await page.getByLabel("Log date", { exact: true }).fill("2024-02-29");
      await page.getByRole("heading", { name: "thursday · 2024-02-29", exact: true }).waitFor();
      await page.getByRole("button", { name: "Add meal", exact: true }).click();
      await fillFood(meal(page, 1), 0, "Historical food", "50");
      // Explicitly fail one save and verify both retryability and draft retention.
      await page.route(
        "**/nutrition/logs/2024-02-29",
        (route) =>
          route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ success: false, message: "Test save unavailable" }),
          }),
        { times: 1 }
      );
      await page.getByRole("button", { name: "Save daily log", exact: true }).click();
      await page.getByRole("alert").filter({ hasText: "Test save unavailable" }).waitFor();
      assert.equal(
        await meal(page, 1).getByLabel("Food name", { exact: true }).inputValue(),
        "Historical food"
      );
      page.once("dialog", (dialog) => dialog.dismiss());
      await page.getByRole("link", { name: "Home", exact: true }).click();
      assert.ok(page.url().endsWith("/byot/nutrition"));
      await saved(page, "log");
      await meal(page, 1).getByLabel("Calories (kcal)", { exact: true }).fill("60");
      await saved(page, "log");
      await page.getByText("60 kcal logged", { exact: true }).waitFor();
      assert.equal(
        (await ByotFoodLog.findOne({ ownerId: user._id, date: "2024-02-29" })).target,
        null
      );
      await page.getByRole("link", { name: "Home", exact: true }).click();
      await page.getByRole("heading", { name: "Nutrition Plan", exact: true }).waitFor();
      await page.getByText("326 kcal logged", { exact: true }).waitFor();
      await noOverflow(page);
      await page.screenshot({ path: path.join(output, `home-${width}.png`), fullPage: true });
      // A competing saved edit must produce a conflict, never discard this draft.
      await page.getByRole("link", { name: "Open nutrition", exact: true }).click();
      await page.getByLabel("Log date", { exact: true }).waitFor();
      await meal(page, 1).getByLabel("Calories (kcal)", { exact: true }).first().fill("300");
      const concurrent = (await nutrition.read(user._id, today)).log;
      const changedMeals = concurrent.meals.map(({ id, name, foods }) => ({ id, name, foods }));
      changedMeals[0].foods[0].calories = 201;
      await nutrition.saveLog(
        user._id,
        today,
        { version: concurrent.version, meals: changedMeals },
        require("node:crypto").randomUUID()
      );
      await page.getByRole("button", { name: "Save daily log", exact: true }).click();
      await page.getByRole("alert").filter({ hasText: "A newer version was saved" }).waitFor();
      assert.equal(
        await meal(page, 1).getByLabel("Calories (kcal)", { exact: true }).first().inputValue(),
        "300"
      );
      // Native browser Back must also preserve the draft when discarded navigation is cancelled.
      const dismissed = new Promise((resolve) =>
        page.once("dialog", async (dialog) => {
          await dialog.dismiss();
          resolve();
        })
      );
      await page.evaluate(() => window.history.back());
      await dismissed;
      await page.waitForFunction(() => window.location.pathname === "/byot/nutrition");
      assert.equal(
        await meal(page, 1).getByLabel("Calories (kcal)", { exact: true }).first().inputValue(),
        "300"
      );
      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: "Reload saved data", exact: true }).click();
      await page.getByText("326.5 kcal logged", { exact: true }).waitFor();
      assert.deepEqual(errors, []);
      await context.close();
      console.log(
        `PASS ${width}px: all nine nutrition acceptance flows, draft retention, discard guard and no overflow`
      );
    }
    console.log(`Screenshots: ${output}`);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
  }
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
