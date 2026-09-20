// Production-bundle visual review. Synthetic accounts and disposable Mongo only.
// Run with the same preview/API ports as backend/scripts/byot-browser-smoke.js.
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.ENABLE_GOOGLE_AUTH = "false";
process.env.CLIENT_ORIGIN = "http://127.0.0.1:5181";
process.env.JWT_SECRET = "isolated-design-access-secret";
process.env.JWT_REFRESH_SECRET = "isolated-design-refresh-secret";
const { createRequire } = require("node:module");
const backend = createRequire(require("node:path").resolve("backend/package.json"));
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { MongoMemoryServer } = backend("mongodb-memory-server");
const mongoose = backend("mongoose");
const { User } = backend("./src/schemas/User.schema");
const { Client } = backend("./src/schemas/Client.schema");
const tokenFor = backend("./src/utils/generateAccessToken");
const app = backend("./src/app");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const output = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "fitos-design-"));
const base = "http://127.0.0.1:5181";
(async () => {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const server = app.listen(5101);
  let browser;
  try {
    browser = await chromium.launch({ channel: "msedge", headless: true });
    const trainer = await User.create({ name: "Synthetic Trainer", role: "TRAINER", email: "design-trainer@example.test" });
    const client = await User.create({ name: "Synthetic Client", role: "CLIENT", email: "design-client@example.test" });
    const admin = await User.create({ name: "Synthetic Admin", role: "ADMIN", email: "design-admin@example.test" });
    const record = await Client.create({ trainerId: trainer._id, userId: client._id, name: client.name, status: "ACTIVE" });
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce", extraHTTPHeaders: { "X-Forwarded-For": width === 390 ? "127.0.0.8" : "127.0.0.9" } });
      // Optional offline pass exercises the existing system-font fallback and
      // avoids an external font outage blocking otherwise local fixture checks.
      if (process.env.DESIGN_OFFLINE_FONTS === "1") {
        await context.route("https://fonts.googleapis.com/**", route => route.abort());
        await context.route("https://fonts.gstatic.com/**", route => route.abort());
      }
      const page = await context.newPage();
      async function capture(name) {
        await page.screenshot({ path: path.join(output, `${name}-${width}.png`), fullPage: !/modal|toast/.test(name), animations: "disabled" });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        if (overflow) console.log("OVERFLOW", name, width, await page.evaluate(() => [...document.querySelectorAll("body *")].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== "absolute").slice(0, 12).map(e => [e.tagName, e.className])));
        assert.equal(overflow, false, `${name} overflows at ${width}`);
        if (process.env.AXE_MODULE) {
          await page.addScriptTag({ path: process.env.AXE_MODULE });
          const results = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ["color-contrast"] })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
          if (results.length) console.log("CONTRAST", name, width, JSON.stringify(results));
        }
        console.log(`CAPTURE ${name} ${width}`);
      }
      await page.goto(base);
      await page.getByRole("heading", { name: /Powering the next/ }).waitFor();
      await capture("homepage");
      if (width === 390) {
        await page.getByRole("button", { name: "Toggle menu" }).click();
        await capture("mobile-menu");
        await page.getByRole("button", { name: "Toggle menu" }).click();
      }
      for (const route of ["about", "contact", "privacy", "terms", "faq", "login", "byot", "account-disabled", "design-system"]) {
        await page.goto(`${base}/${route}`);
        await page.locator("h1, h2").first().waitFor();
        await capture(route);
      }
      await page.goto(`${base}/login`);
      await page.getByRole("button", { name: "Admin sign-in" }).click();
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page.getByText("Email and password are required.").waitFor();
      await page.keyboard.press("Tab");
      await capture("validation-focus");
      const byot = await User.create({ name: "Synthetic BYOT", role: "BYOT", email: `design-byot-${width}@example.test` });
      await page.evaluate(token => localStorage.setItem("fitos.accessToken", token), tokenFor(byot));
      await page.goto(`${base}/byot/onboarding`);
      await page.getByRole("heading", { name: "Make it your own", exact: true }).waitFor();
      await capture("byot-onboarding");
      for (const [actor, portal] of [[admin, "admin"], [trainer, "trainer"], [client, "client"]]) {
        await page.evaluate(token => localStorage.setItem("fitos.accessToken", token), tokenFor(actor));
        await page.goto(`${base}/${portal}/dashboard`);
        await page.getByRole("heading", { name: `${portal[0].toUpperCase() + portal.slice(1)} Portal`, exact: true }).waitFor();
        await page.waitForTimeout(600);
        await capture(`${portal}-home`);
        if (portal === "admin") {
          let release;
          const gate = new Promise(resolve => { release = resolve; });
          await page.route("**/api/admin/byot-users**", async route => { await gate; await route.continue(); });
          await page.goto(`${base}/admin/byot-users`, { waitUntil: "domcontentloaded" });
          await page.getByRole("heading", { name: "BYOT Users", exact: true }).waitFor();
          await capture("admin-loading");
          await Promise.all([
            page.waitForResponse(response => response.url().includes("/api/admin/byot-users")),
            Promise.resolve().then(() => release()),
          ]);
          await page.unroute("**/api/admin/byot-users**");
          await page.locator("select").first().focus();
          await page.keyboard.press("ArrowDown");
          await page.waitForTimeout(400);
          await capture("admin-filter-empty");
        }
        if (portal === "trainer") {
          await page.goto(`${base}/trainer/client/${record._id}`);
          await page.getByRole("button", { name: "Workout Plan", exact: true }).waitFor();
          await capture("trainer-detail");
          await page.getByRole("button", { name: "Delete Client", exact: true }).click();
          await page.getByRole("dialog", { name: "Delete Client" }).waitFor();
          await page.keyboard.press("Shift+Tab");
          assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), "Delete");
          await capture("modal-keyboard");
          await page.getByRole("button", { name: "Cancel", exact: true }).hover();
          await capture("modal-hover");
          await page.keyboard.press("Escape");
          assert.equal(await page.getByRole("dialog").count(), 0);
          await page.getByRole("button", { name: "Workout Plan", exact: true }).click();
          await page.getByRole("button", { name: "Create New Plan", exact: true }).click();
          await capture("workout-editor");
          await page.getByRole("button", { name: "Publish Plan", exact: true }).click();
          await page.getByRole("status").waitFor();
          await capture("toast-validation");
          await page.getByRole("button", { name: "Dismiss notification" }).click();
          await page.getByRole("button", { name: "Nutrition Plan", exact: true }).click();
          await page.getByRole("button", { name: "Create New Plan", exact: true }).click();
          await capture("nutrition-editor");
        }
        if (portal === "client") for (const route of ["nutrition", "progress", "workout", "messages"]) {
          await page.goto(`${base}/client/${route}`);
          await page.getByRole("heading", { name: "Client Portal", exact: true }).waitFor();
          await page.waitForTimeout(400);
          await capture(`client-${route}`);
        }
      }
      await context.close();
    }
    console.log(`Screenshots: ${output}`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect(); await mongo.stop();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
