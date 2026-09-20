"use strict";
// Isolated Linux preflight: no .env, external DB, provider, or production traffic.
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { performance } = require("node:perf_hooks");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const sharp = require("sharp");

(async () => {
  const mongo = await MongoMemoryServer.create();
  let child;
  try {
    const started = performance.now();
    const port = 5197;
    const testEnv = { ...process.env, NODE_ENV: "production", LOG_LEVEL: "silent",
      ENABLE_GOOGLE_AUTH: "false", PORT: String(port), MONGO_URI: mongo.getUri(),
      JWT_SECRET: "isolated-release-access", JWT_REFRESH_SECRET: "isolated-release-refresh",
      CLIENT_ORIGIN: "http://127.0.0.1:5181", CLOUDINARY_CLOUD_NAME: "synthetic",
      CLOUDINARY_API_KEY: "synthetic", CLOUDINARY_API_SECRET: "synthetic", SENTRY_DSN: "" };
    child = spawn(process.execPath, [require("node:path").join(__dirname, "../src/server.js")],
      { env: testEnv, stdio: ["ignore", "ignore", "ignore"], windowsHide: true });
    const exited = once(child, "exit");
    let healthy = false;
    for (let i = 0; i < 120; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1000) });
        if (res.status === 200) { assert.equal((await res.json()).db, "connected"); healthy = true; break; }
      } catch { /* Server is still initialising. */ }
      if (child.exitCode !== null) throw new Error("Server exited before readiness");
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(healthy, "Server health must become ready after indexes");
    const startupMs = Math.round(performance.now() - started);
    await mongoose.connect(mongo.getUri());
    const indexes = {};
    for (const collection of await mongoose.connection.db.listCollections().toArray()) {
      if (/byot|users/.test(collection.name)) {
        indexes[collection.name] = (await mongoose.connection.db.collection(collection.name).indexes())
          .map(({ key, unique, expireAfterSeconds }) => ({ key, ...(unique ? { unique } : {}),
            ...(expireAfterSeconds !== undefined ? { expireAfterSeconds } : {}) }));
      }
    }
    assert.ok(Object.keys(indexes).length >= 9, "BYOT indexes must exist before readiness");
    const denied = await fetch(`http://127.0.0.1:${port}/api/byot/profile`);
    assert.equal(denied.status, 401);
    assert.match(denied.headers.get("cache-control"), /private.*no-store/);

    // Worst permitted pixel count, bounded to two parallel upload decodes.
    // This is a local synthetic microbenchmark, not a hosting capacity claim.
    Object.assign(process.env, testEnv);
    const { sanitize } = require("../src/services/byotMediaProvider");
    const input = await sharp({ create: { width: 4000, height: 5000, channels: 3,
      background: "#334455" } }).jpeg().toBuffer();
    const startImages = performance.now();
    let peakRss = process.memoryUsage().rss;
    const sample = setInterval(() => { peakRss = Math.max(peakRss, process.memoryUsage().rss); }, 10);
    try {
      const images = await Promise.all([sanitize(input, "image/jpeg"), sanitize(input, "image/jpeg")]);
      for (const image of images) {
        const metadata = await sharp(image).metadata();
        assert.ok(metadata.width <= 2560 && metadata.height <= 2560);
        assert.equal(metadata.exif, undefined);
      }
    } finally { clearInterval(sample); }
    const imageMs = Math.round(performance.now() - startImages);
    const shutdownStart = performance.now();
    child.kill("SIGTERM");
    const [code, signal] = await Promise.race([exited, new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error("Shutdown exceeded 12 seconds")), 12000); timer.unref();
    })]);
    assert.equal(code, 0); assert.equal(signal, null);
    console.log(JSON.stringify({ ok: true, platform: process.platform, arch: process.arch,
      node: process.version, sharp: sharp.versions.sharp, vips: sharp.versions.vips, startupMs,
      shutdownMs: Math.round(performance.now() - shutdownStart), images: { count: 2,
        pixelsEach: 20000000, inputBytes: input.length, elapsedMs: imageMs,
        sampledPeakRssMiB: Math.round(peakRss / 1048576), maxRssKiB: process.resourceUsage().maxRSS }, indexes }, null, 2));
  } finally {
    if (child && child.exitCode === null) child.kill("SIGKILL");
    await mongoose.disconnect(); await mongo.stop();
  }
})().catch(error => { console.error("Isolated runtime preflight failed:", error.message); process.exitCode = 1; });
