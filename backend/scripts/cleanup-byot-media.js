"use strict";
require("dotenv").config();
const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const { randomUUID } = require("crypto");
const { ByotPhotoAttempt } = require("../src/schemas/ByotProgress.schema");
const { cleanup } = require("../src/services/byotPhoto.service");
const runId = randomUUID();
(async () => {
  const started = Date.now();
  await mongoose.connect(env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    maxPoolSize: 2,
  });
  try {
    const counts = await cleanup(100);
    const due = { state: { $ne: "deleted" }, nextCleanupAt: { $lte: new Date() } };
    const remainingDue = await ByotPhotoAttempt.countDocuments(due).maxTimeMS(10000);
    const oldest = await ByotPhotoAttempt.findOne(due)
      .select({ nextCleanupAt: 1, _id: 0 })
      .sort({ nextCleanupAt: 1 })
      .maxTimeMS(10000)
      .lean();
    console.log(
      JSON.stringify({
        runId,
        ...counts,
        remainingDue,
        oldestDueAt: oldest?.nextCleanupAt ?? null,
        durationMs: Date.now() - started,
      })
    );
    if (counts.failed) process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})().catch(() => {
  console.error(
    JSON.stringify({ runId, failed: true, message: "BYOT cleanup failed; retry required" })
  );
  process.exitCode = 1;
});
