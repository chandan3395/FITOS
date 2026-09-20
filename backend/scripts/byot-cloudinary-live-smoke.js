/* Live provider verification with synthetic images and an isolated database.
 * Uses existing backend/.env credentials. Never prints secrets or delivery URLs. */
"use strict";
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.ENABLE_GOOGLE_AUTH = "false";
const { randomUUID } = require("crypto");
const assert = require("assert/strict");
const sharp = require("sharp");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const { User } = require("../src/schemas/User.schema");
const { ByotProfile } = require("../src/schemas/ByotProfile.schema");
const {
  ByotProgress: Progress,
  ByotPhotoAttempt: Attempt,
  ByotPhotoBudget: Budget,
} = require("../src/schemas/ByotProgress.schema");
const progress = require("../src/services/byotProgress.service");
const photos = require("../src/services/byotPhoto.service");
const provider = require("../src/services/byotMediaProvider");
const { cloudinary } = require("../src/config/cloudinary");
const tokenFor = require("../src/utils/generateAccessToken");
const app = require("../src/app");
(async () => {
  provider.configured();
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([Progress.init(), Attempt.init(), Budget.init(), ByotProfile.init()]);
  let owner;
  try {
    owner = await User.create({
      name: "Synthetic privacy test",
      email: `byot-live-${randomUUID()}@example.test`,
      role: "BYOT",
    });
    const today = new Date().toISOString().slice(0, 10);
    await ByotProfile.create({
      ownerId: owner._id,
      timezone: "UTC",
      startingWeightKg: 80,
      checkInAnchorDate: today,
      onboardingCompletedAt: new Date(),
    });
    let record = await progress.save(
      owner._id,
      today,
      { version: 0, measurements: { weightKg: 80 } },
      randomUUID(),
      true
    );
    const bytes = await sharp({
      create: { width: 400, height: 600, channels: 3, background: "#31557a" },
    })
      .jpeg()
      .toBuffer();
    const attach = async () => {
      const result = await photos.init(
        owner._id,
        today,
        "front",
        { version: record.version },
        randomUUID()
      );
      await photos.upload(owner._id, result.attempt.id, bytes, "image/jpeg");
      record = await photos.attach(
        owner._id,
        today,
        "front",
        { version: result.record.version, attemptId: result.attempt.id },
        randomUUID()
      );
      return Attempt.findOne({ ownerId: owner._id, id: record.checkin.photos.front.id }).lean();
    };
    const first = await attach();
    for (const size of ["original", "thumbnail"]) {
      const r = await request(app)
        .get(`/api/byot/progress/checkins/${today}/photos/front/${size}`)
        .set("Authorization", `Bearer ${tokenFor(owner)}`);
      assert.equal(r.status, 200);
      assert.equal(r.headers["cache-control"], "private, no-store");
      assert.equal((await sharp(r.body).metadata()).height, size === "thumbnail" ? 360 : 600);
      assert.equal(
        (await request(app).get(`/api/byot/progress/checkins/${today}/photos/front/${size}`))
          .status,
        401
      );
    }
    // Unsigned original, unsigned authenticated transformation, and public-type paths.
    for (const options of [
      { type: "authenticated" },
      { type: "authenticated", width: 360, crop: "limit" },
      { type: "upload" },
      { type: "upload", width: 360, crop: "limit" },
    ]) {
      const url = cloudinary.url(first.publicId, {
        secure: true,
        sign_url: false,
        format: "jpg",
        ...options,
      });
      const r = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(20000) });
      await r.arrayBuffer();
      assert.ok([400, 401, 403, 404].includes(r.status), "Unsigned delivery must be denied");
    }
    for (const role of ["ADMIN", "TRAINER", "CLIENT", "BYOT"]) {
      const other = await User.create({
        name: "Unrelated",
        email: `unrelated-${randomUUID()}@example.test`,
        role,
      });
      if (role === "BYOT")
        await ByotProfile.create({
          ownerId: other._id,
          timezone: "UTC",
          onboardingCompletedAt: new Date(),
        });
      const r = await request(app)
        .get(`/api/byot/progress/checkins/${today}/photos/front/original`)
        .set("Authorization", `Bearer ${tokenFor(other)}`);
      assert.equal(r.status, role === "BYOT" ? 404 : 403);
    }
    const second = await attach();
    const oldToken = tokenFor(owner._id, owner.role);
    const management = require("../src/services/adminByot.service");
    await management.setActive(String(owner._id), { isActive: false, expectedIsActive: true });
    const media = `/api/byot/progress/checkins/${today}/photos/front/original`;
    assert.equal((await request(app).get(media).set("Authorization", `Bearer ${oldToken}`)).status, 401);
    await management.setActive(String(owner._id), { isActive: true, expectedIsActive: false });
    assert.equal((await request(app).get(media).set("Authorization", `Bearer ${oldToken}`)).status, 401);
    assert.equal((await request(app).get(media).set("Authorization", `Bearer ${tokenFor(owner._id, owner.role, 1)}`)).status, 200);
    assert.notEqual(second.publicId, first.publicId);
    await photos.cleanup(100);
    let gone = false;
    try {
      await cloudinary.api.resource(first.publicId, {
        type: "authenticated",
        resource_type: "image",
      });
    } catch (err) {
      gone = (err.http_code || err.error?.http_code) === 404;
    }
    assert.ok(gone, "Replaced asset must be deleted");
    await photos.remove(owner._id, today, "front", { version: record.version }, randomUUID());
    // Execute the actual operations command against ONLY this temporary database.
    const result = await new Promise((resolve, reject) => {
      require("child_process").execFile(process.execPath, [require("path").join(__dirname, "cleanup-byot-media.js")],
        { env: { ...process.env, MONGO_URI: mongo.getUri() }, timeout: 90000, windowsHide: true },
        (error, stdout) => error ? reject(new Error("Cleanup command failed")) : resolve(JSON.parse(stdout.trim())));
    });
    assert.ok(result.runId); assert.equal(result.failed, 0); assert.ok(result.deleted >= 1);
    gone = false;
    try {
      await cloudinary.api.resource(second.publicId, {
        type: "authenticated",
        resource_type: "image",
      });
    } catch (err) {
      gone = (err.http_code || err.error?.http_code) === 404;
    }
    assert.ok(gone, "Removed asset must be deleted");
    console.log(
      "PASS live Cloudinary: authenticated upload/metadata, protected original/thumbnail proxy, unsigned/public and unrelated-role denial, disabled/re-enabled session denial, replacement, actual cleanup command/operational counts and deletion."
    );
  } finally {
    const unresolved = [];
    if (owner) {
      await Progress.deleteMany({ ownerId: owner._id });
      const attempts = await Attempt.find({ ownerId: owner._id, state: { $ne: "deleted" } }).lean();
      for (const a of attempts) {
        try {
          await provider.destroy(a.publicId);
        } catch {
          unresolved.push(a.publicId);
        }
      }
    }
    if (unresolved.length) {
      const file = require("path").join(__dirname, "../.byot-live-cleanup.json");
      require("fs").writeFileSync(file, JSON.stringify({ publicIds: unresolved }, null, 2));
      console.error(
        "Live test cleanup needs retry; identifiers saved in backend/.byot-live-cleanup.json"
      );
      process.exitCode = 1;
    }
    await mongoose.disconnect();
    await mongo.stop();
  }
})().catch((err) => {
  console.error(
    `Live provider verification failed: ${err instanceof assert.AssertionError ? err.message : "provider or environment unavailable"}`
  );
  process.exitCode = 1;
});
