/* Isolated database + generated test sessions, never live OAuth/deployed cookies.
 * Start Vite on 127.0.0.1:5181 with VITE_API_URL=http://localhost:5101/api.
 * PLAYWRIGHT_MODULE may point to a bundled Playwright installation. */
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.ENABLE_GOOGLE_AUTH = "false";
process.env.CLIENT_ORIGIN = "http://127.0.0.1:5181";
process.env.JWT_SECRET = "isolated-workout-browser-test-access";
process.env.JWT_REFRESH_SECRET = "isolated-workout-browser-test-refresh";
const launchBrowser = require("./browser-engine");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const output = require("node:fs").mkdtempSync(
  path.join(require("node:os").tmpdir(), "fitos-workout-")
);
const { User } = require("../src/schemas/User.schema");
const { ByotProfile } = require("../src/schemas/ByotProfile.schema");
const {
  ByotWorkoutRoutine: Routine,
  ByotDailyWorkout: Daily,
} = require("../src/schemas/ByotWorkout.schema");
const workouts = require("../src/services/byotWorkout.service");
const clock = require("../src/utils/byotClock");
let now;
clock.now = () => new Date(now); // Isolated server process only; no production clock bypass.
const tokenFor = require("../src/utils/generateAccessToken");
const app = require("../src/app");
const clean = ({ version, name, days }) => ({ version, name, days });
const button = (page, name) => page.getByRole("button", { name, exact: true });
async function weekly(page) {
  await button(page, "Weekly Routine").click();
}
async function daily(page) {
  await button(page, "Daily Workout").click();
}
async function save(page) {
  await button(page, "Save weekly routine").click();
  await page.getByText("Weekly routine saved.", { exact: true }).waitFor();
}
async function overflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
}
(async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([ByotProfile.init(), Routine.init(), Daily.init()]);
  const server = await new Promise((resolve) => {
    const s = app.listen(5101, () => resolve(s));
  });
  let browser;
  try {
    browser = await launchBrowser();
    for (const width of [1440, 390]) {
      now = "2026-09-21T08:00:00Z";
      const user = await User.create({
        name: "Workout Test",
        email: `workout-${width}@example.test`,
        role: "BYOT",
      });
      await ByotProfile.create({
        ownerId: user._id,
        timezone: "Asia/Kolkata",
        onboardingCompletedAt: new Date(),
        checkInAnchorDate: "2026-09-19",
      });
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(
        (token) => localStorage.setItem("fitos.accessToken", token),
        tokenFor(user)
      );
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.clock.setFixedTime(new Date(now));
      await page.goto("http://127.0.0.1:5181/byot/workout");
      await page.getByText("No routine yet.", { exact: false }).waitFor();
      assert.equal(await Daily.countDocuments({ ownerId: user._id }), 0);
      await weekly(page);
      await page.getByLabel("Routine name", { exact: true }).fill("Weekly strength");
      await page.getByLabel("Day label (optional)").fill("Leg day");
      await page.getByLabel("Day type").selectOption("workout");
      await button(page, "Add exercise").click();
      await page.getByLabel("Exercise name", { exact: true }).fill("Squat");
      await page.getByLabel("Planned sets (optional)").fill("3");
      await page.getByLabel("Reps description (optional)").fill("8–12");
      await page.getByLabel("Planned weight (kg, optional)").fill("0");
      await page.getByLabel("Rest (seconds, optional)").fill("60");
      await button(page, "Add exercise").click();
      await page.getByLabel("Exercise name", { exact: true }).nth(1).fill("Lunge");
      await button(page, "Move up").nth(1).click();
      assert.equal(
        await page.getByLabel("Exercise name", { exact: true }).first().inputValue(),
        "Lunge"
      );
      page.once("dialog", (d) => d.accept());
      await button(page, "Copy day").click();
      await page.getByLabel("Editing weekday").selectOption("sunday");
      await page.getByLabel("Day type").selectOption("rest");
      await save(page);
      await page.reload();
      await weekly(page);
      assert.equal(
        await page.getByLabel("Routine name", { exact: true }).inputValue(),
        "Weekly strength"
      );
      let plan = await workouts.getRoutine(user._id);
      assert.notEqual(plan.days[0].exercises[0].id, plan.days[1].exercises[0].id);
      assert.equal(plan.days[6].kind, "rest");
      await overflow(page);
      await page.screenshot({ path: path.join(output, `routine-${width}.png`), fullPage: true });
      await daily(page);
      await page.getByRole("checkbox", { name: "Complete Lunge", exact: true }).dblclick();
      await page.getByText("1 of 2 completed · 50%", { exact: true }).waitFor();
      assert.equal(await Daily.countDocuments({ ownerId: user._id }), 1);
      await page.getByRole("link", { name: "Home", exact: true }).click();
      await page.getByText("1 of 2 completed · 50%", { exact: true }).waitFor();
      await page.getByRole("checkbox", { name: "Complete Lunge", exact: true }).click();
      await page.getByText("0 of 2 completed · 0%", { exact: true }).waitFor();
      await page.getByRole("checkbox", { name: "Complete Squat", exact: true }).click();
      await page.getByText("1 of 2 completed · 50%", { exact: true }).waitFor();
      await page.getByRole("heading", { name: "Nutrition Plan", exact: true }).waitFor();
      await page.getByRole("heading", { name: "Upcoming Check-in", exact: true }).waitFor();
      await overflow(page);
      await page.screenshot({ path: path.join(output, `home-${width}.png`), fullPage: true });
      await page.getByRole("link", { name: "Workout", exact: true }).click();
      await weekly(page);
      await page.getByLabel("Exercise name", { exact: true }).first().fill("Changed plan exercise");
      await save(page);
      await daily(page);
      await page.getByRole("checkbox", { name: "Complete Lunge", exact: true }).waitFor();
      assert.equal(
        await page
          .getByRole("checkbox", { name: "Complete Changed plan exercise", exact: true })
          .count(),
        0
      );
      // A lost response retries the same desired state and receipt rather than toggling again.
      await page.route(
        "**/workouts/days/*/exercises/*",
        async (route) => {
          await route.fetch();
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ message: "Test lost response" }),
          });
        },
        { times: 1 }
      );
      await page.getByRole("checkbox", { name: "Complete Lunge", exact: true }).click();
      await page.getByRole("alert").filter({ hasText: "Test lost response" }).waitFor();
      assert.equal(
        await page.getByRole("checkbox", { name: "Complete Lunge", exact: true }).isChecked(),
        false
      );
      await button(page, "Retry save").click();
      await page.getByText("2 of 2 completed · 100%", { exact: true }).waitFor();
      // A competing completion reports a conflict and recovers by explicit reload.
      let record = await workouts.readDay(user._id);
      await workouts.writeDay(
        user._id,
        record.date,
        { version: record.version, completed: false },
        randomUUID(),
        record.exercises[0].id
      );
      await page.getByRole("checkbox", { name: "Complete Squat", exact: true }).click();
      await page.getByRole("alert").filter({ hasText: "A newer version was saved" }).waitFor();
      await button(page, "Reload latest workout").click();
      await page.getByText("1 of 2 completed · 50%", { exact: true }).waitFor();
      // Controlled local midnight, no machine clock change. The following day starts incomplete.
      await page.getByRole("link", { name: "Home", exact: true }).click();
      await page.getByText("1 of 2 completed · 50%", { exact: true }).waitFor();
      now = "2026-09-21T18:30:01Z";
      await page.clock.setFixedTime(new Date(now));
      await page.getByText("Today · 2026-09-22", { exact: true }).waitFor();
      await page.getByText("0 of 2 completed · 0%", { exact: true }).waitFor();
      await page.getByRole("link", { name: "Workout", exact: true }).click();
      await page.waitForFunction(
        () => document.querySelector('input[aria-label="Workout date"]').value === "2026-09-22"
      );
      await page.getByText("0 of 2 completed · 0%", { exact: true }).waitFor();
      await page.getByLabel("Workout date", { exact: true }).fill("2026-09-21");
      await page.getByRole("checkbox", { name: "Complete Squat", exact: true }).waitFor();
      await page.getByRole("checkbox", { name: "Complete Squat", exact: true }).click();
      await page.getByText("0 of 2 completed · 0%", { exact: true }).waitFor();
      await page.getByLabel("Workout date", { exact: true }).fill("2026-09-20");
      await page.getByText("No workout recorded.", { exact: false }).waitFor();
      // Older date responses must not overwrite a newer selection.
      let release;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      let requested;
      const intercepted = new Promise((resolve) => {
        requested = resolve;
      });
      await page.route(
        "**/workouts/day?date=2026-09-19",
        async (route) => {
          const response = await route.fetch();
          requested();
          await gate;
          await route.fulfill({ response });
        },
        { times: 1 }
      );
      await page.getByLabel("Workout date", { exact: true }).fill("2026-09-19");
      await intercepted;
      await page.getByLabel("Workout date", { exact: true }).fill("2026-09-21");
      await page.getByRole("checkbox", { name: "Complete Squat", exact: true }).waitFor();
      release();
      await page.waitForTimeout(150);
      assert.equal(
        await page.getByLabel("Workout date", { exact: true }).inputValue(),
        "2026-09-21"
      );
      await page.getByRole("checkbox", { name: "Complete Squat", exact: true }).focus();
      await page.keyboard.press("Space");
      await page.getByText("1 of 2 completed \u00b7 50%", { exact: true }).waitFor();
      // Failed routine writes retain draft; competing writes require deliberate reload.
      await weekly(page);
      await page.getByLabel("Routine name", { exact: true }).fill("Unsaved draft");
      await page.route(
        "**/workouts/routine",
        (route) =>
          route.request().method() === "PUT"
            ? route.fulfill({
                status: 503,
                contentType: "application/json",
                body: JSON.stringify({ message: "Test routine unavailable" }),
              })
            : route.continue(),
        { times: 1 }
      );
      await button(page, "Save weekly routine").click();
      await page.getByRole("alert").filter({ hasText: "Test routine unavailable" }).waitFor();
      assert.equal(
        await page.getByLabel("Routine name", { exact: true }).inputValue(),
        "Unsaved draft"
      );
      page.once("dialog", (d) => d.dismiss());
      await page.getByRole("link", { name: "Home", exact: true }).click();
      assert.ok(page.url().endsWith("/byot/workout"));
      plan = await workouts.getRoutine(user._id);
      await workouts.saveRoutine(
        user._id,
        { ...clean(plan), name: "Competing routine" },
        randomUUID()
      );
      await button(page, "Save weekly routine").click();
      await page.getByRole("alert").filter({ hasText: "A newer version was saved" }).waitFor();
      assert.equal(
        await page.getByLabel("Routine name", { exact: true }).inputValue(),
        "Unsaved draft"
      );
      page.once("dialog", (d) => d.accept());
      await button(page, "Reload latest routine").click();
      await page.waitForFunction(
        () =>
          document.querySelector('form[aria-label="Weekly routine editor"] input').value ===
          "Competing routine"
      );
      // Destructive rest-day change can be cancelled and then explicitly confirmed.
      page.once("dialog", (d) => d.dismiss());
      await page.getByLabel("Day type").selectOption("rest");
      assert.equal(await page.getByLabel("Exercise name", { exact: true }).count(), 2);
      page.once("dialog", (d) => d.accept());
      await page.getByLabel("Day type").selectOption("rest");
      await save(page);
      await overflow(page);
      await page.getByRole("link", { name: "Home", exact: true }).click();
      await page.getByText("Today · 2026-09-22", { exact: true }).waitFor();
      now = "2026-09-23T08:00:00Z";
      await page.clock.setFixedTime(new Date(now));
      await page.evaluate(() => {
        window.dispatchEvent(new Event("focus"));
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await page.getByText("Today · 2026-09-23", { exact: true }).waitFor();
      await page.getByText("This day is not configured.", { exact: false }).waitFor();
      await page.getByRole("link", { name: "Nutrition", exact: true }).click();
      await page.getByLabel("Log date", { exact: true }).waitFor();
      await overflow(page);
      assert.deepEqual(errors, []);
      await context.close();
      console.log(
        `PASS ${width}px: routine creation/copy/reorder/rest/persistence; Home completion/undo; double clicks/lost-response retry; snapshots/history; midnight; failed drafts/conflicts/discard; nutrition/navigation/overflow`
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
