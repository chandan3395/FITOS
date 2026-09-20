"use strict";
// Test tooling only. Chromium defaults to installed Edge on Windows; other
// engines use Playwright's bundled builds, not a real Safari/iPhone device.
module.exports = async function launchBrowser() {
  const engines = require(process.env.PLAYWRIGHT_MODULE || "playwright");
  const name = process.env.BROWSER_ENGINE || "chromium";
  if (!["chromium", "firefox", "webkit"].includes(name)) throw new Error("Unsupported test browser");
  return engines[name].launch({ headless: true,
    ...(name === "chromium" && process.platform === "win32" ? { channel: "msedge" } : {}) });
};
