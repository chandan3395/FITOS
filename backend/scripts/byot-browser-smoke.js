process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.ENABLE_GOOGLE_AUTH = "false";
process.env.CLIENT_ORIGIN = "http://127.0.0.1:5181";
process.env.JWT_SECRET = "isolated-browser-test-access-secret";
process.env.JWT_REFRESH_SECRET = "isolated-browser-test-refresh-secret";
const launchBrowser = require("./browser-engine");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const { User } = require("../src/schemas/User.schema");
const { ByotProfile } = require("../src/schemas/ByotProfile.schema");
const app = require("../src/app");
const tokenFor = require("../src/utils/generateAccessToken");
const assert = require("node:assert/strict");
const path = require("node:path");
const output = require("node:fs").mkdtempSync(
  path.join(require("node:os").tmpdir(), "fitos-byot-")
);
// Start Vite on 127.0.0.1:5181 with VITE_API_URL=http://localhost:5101/api first.
// Optional PLAYWRIGHT_MODULE selects an externally installed Playwright package.
(async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await ByotProfile.init();
  const server = await new Promise((resolve) => {
    const s = app.listen(5101, () => resolve(s));
  });
  let browser;
  try {
    browser = await launchBrowser();
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const user = await User.create({
        name: "BYOT Browser Test",
        email: `browser-${width}@example.test`,
        role: "BYOT",
      });
      let sockets = 0;
      page.on("websocket", (ws) => {
        if (ws.url().includes("socket.io")) sockets++;
      });
      await page.goto("http://127.0.0.1:5181/byot");
      await page.getByRole("heading", { name: "Be Your Own Trainer" }).waitFor();
      await page.evaluate(
        (token) => localStorage.setItem("fitos.accessToken", token),
        tokenFor(user)
      );
      await page.goto("http://127.0.0.1:5181/byot/workout");
      await page.getByRole("heading", { name: "Make it your own" }).waitFor();
      await page.getByLabel("Starting weight (kg)").fill("75");
      await page.getByLabel("Height (cm)").fill("175");
      await page.getByLabel("Your goal").fill("Build strength");
      await page.getByLabel("Timezone").fill("Asia/Kolkata");
      await page.getByRole("button", { name: "Save and enter BYOT" }).click();
      await page.getByRole("heading", { name: "Upcoming Check-in" }).waitFor();
      assert.equal(await page.locator("nav a").count(), 4);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false
      );
      await page.screenshot({
        path: path.join(output, `byot-dashboard-${width}.png`),
        fullPage: true,
      });
      await page.reload();
      await page.getByRole("heading", { name: "Upcoming Check-in" }).waitFor();
      await page.getByRole("link", { name: "Nutrition", exact: true }).click();
      await page.getByLabel("Log date", { exact: true }).waitFor();
      for (const name of ["Progress"]) {
        await page.getByRole("link", { name, exact: true }).click();
        await page.getByLabel("Progress date", { exact: true }).waitFor();
      }
      await page.getByRole("link", { name: "Workout", exact: true }).click();
      await page.getByLabel("Workout date", { exact: true }).waitFor();
      assert.equal(sockets, 0);
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await page.getByRole("heading", { name: "Be Your Own Trainer" }).waitFor();
      await context.close();
      console.log(
        `PASS ${width}px: guest, direct route, onboarding, dashboard, reload, modules, sign-out, no overflow or messaging sockets`
      );
    }
    // The shared RouterProvider still renders and navigates the existing portals.
    const trainer = await User.create({ name: "Router Trainer", role: "TRAINER", email: "router-trainer@example.test" });
    const client = await User.create({ name: "Router Client", role: "CLIENT", email: "router-client@example.test" });
    const admin = await User.create({ name: "Router Admin", role: "ADMIN", email: "router-admin@example.test" });
    await require("../src/schemas/Client.schema").Client.create({ trainerId: trainer._id, userId: client._id, name: "Router Client", status: "ACTIVE" });
    for (const [actor, portal, link, destination] of [[admin, "admin", "Trainers", "trainers"], [trainer, "trainer", "Clients", "clients"], [client, "client", "Nutrition", "nutrition"]]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.addInitScript(token => localStorage.setItem("fitos.accessToken", token), tokenFor(actor));
      const page = await context.newPage();
      const pageErrors = []; page.on("pageerror", error => pageErrors.push(error.message));
      await page.goto(`http://127.0.0.1:5181/${portal}/dashboard`);
      await page.getByRole("heading", { name: `${portal[0].toUpperCase() + portal.slice(1)} Portal`, exact: true }).waitFor();
      await page.getByRole("link", { name: link, exact: true }).first().click();
      await page.waitForURL(`**/${portal}/${destination}`);
      await page.reload();
      await page.getByRole("heading", { name: `${portal[0].toUpperCase() + portal.slice(1)} Portal`, exact: true }).waitFor();
      assert.deepEqual(pageErrors, []);
      await context.close(); console.log(`PASS ${portal}: direct dashboard, navigation and refresh`);
    }
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
