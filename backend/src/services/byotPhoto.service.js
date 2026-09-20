"use strict";
const { randomUUID, createHash } = require("crypto");
const {
  ByotProgress: Progress,
  ByotPhotoAttempt: Attempt,
  ByotPhotoBudget: Budget,
} = require("../schemas/ByotProgress.schema");
const progress = require("./byotProgress.service");
const provider = require("./byotMediaProvider");
const v = require("../validators/byotProgress.validator");
const mutate = require("../utils/byotMutation");
const ApiError = require("../utils/ApiError");
// Expiries and quotas use real elapsed time, independent of fitness calendar dates.
const hash = (value) => createHash("sha256").update(value).digest("hex");
const response = (a) => ({ id: a.id, state: a.state, expiresAt: a.expiresAt });
async function reserve(ownerId, id) {
  try {
    await Budget.updateOne(
      { ownerId },
      { $setOnInsert: { day: "", count: 0, pending: [] } },
      { upsert: true }
    );
  } catch (err) {
    if (err.code !== 11000) throw err;
  }
  const day = new Date().toISOString().slice(0, 10);
  const result = await Budget.findOneAndUpdate(
    {
      ownerId,
      $expr: {
        $and: [
          { $lt: [{ $size: "$pending" }, 6] },
          { $or: [{ $ne: ["$day", day] }, { $lt: ["$count", 24] }] },
        ],
      },
    },
    [
      {
        $set: {
          day,
          count: { $cond: [{ $eq: ["$day", day] }, { $add: ["$count", 1] }, 1] },
          pending: { $concatArrays: ["$pending", [id]] },
        },
      },
    ],
    { returnDocument: "after", updatePipeline: true }
  );
  if (!result)
    throw new ApiError(
      429,
      "Photo limit reached: 24 upload attempts per UTC day and 6 pending uploads. Finish uploads or wait for cleanup."
    );
}
async function init(ownerId, date, slot, body, key) {
  const ctx = await progress.context(ownerId, date, true);
  v.slot(slot);
  v.metadata(body, [], key);
  provider.configured();
  const requestHash = hash(JSON.stringify({ date: ctx.date, slot, version: body.version }));
  let attempt = await Attempt.findOne({ ownerId, requestKey: key }).lean();
  if (attempt && attempt.requestHash !== requestHash)
    throw new ApiError(409, "Upload request key already used for different changes");
  if (!attempt) {
    const record = await Progress.findOne({ ownerId, date: ctx.date }).lean();
    if (!record?.checkin.active)
      throw new ApiError(409, "Save a check-in draft before uploading photos");
    if (record.version !== body.version)
      throw new ApiError(409, "A newer version was saved. Reload before uploading.");
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
    try {
      attempt = (
        await Attempt.create({
          ownerId,
          id,
          date: ctx.date,
          slot,
          requestKey: key,
          requestHash,
          publicId: `fitos/byot/${ownerId}/${ctx.date}/${slot}/${id}`,
          expiresAt,
          nextCleanupAt: expiresAt,
        })
      ).toObject();
    } catch (err) {
      if (err.code !== 11000) throw err;
      throw new ApiError(409, "Upload initialization is in progress. Retry the same request.");
    }
    try {
      await reserve(ownerId, id);
      await Attempt.updateOne({ ownerId, id }, { reserved: true });
      attempt.reserved = true;
    } catch (err) {
      await Attempt.updateOne({ ownerId, id }, { state: "cleanup", nextCleanupAt: new Date() });
      throw err;
    }
  }
  if (!attempt.reserved)
    throw new ApiError(409, "Upload initialization is in progress. Retry the same request.");
  if (attempt.expiresAt < new Date() || attempt.state === "cleanup" || attempt.state === "deleted")
    throw new ApiError(409, "Upload attempt expired. Start another upload.");
  const saved = await mutate(
    Progress,
    { ownerId, date: ctx.date },
    body,
    key,
    `upload-init:${attempt.id}`,
    (old) => {
      if (!old?.checkin.active) throw new ApiError(409, "Save a check-in draft first");
      return {
        checkin: { ...old.checkin, pending: { ...old.checkin.pending, [slot]: attempt.id } },
      };
    }
  );
  return { attempt: response(attempt), record: progress.view(saved, ctx) };
}
async function find(ownerId, id) {
  if (!v.UUID.test(id)) v.fail("Invalid upload attempt");
  const attempt = await Attempt.findOne({ ownerId, id }).lean();
  if (!attempt) throw new ApiError(404, "Upload attempt not found");
  return attempt;
}
async function upload(ownerId, id, bytes, mime) {
  const attempt = await find(ownerId, id);
  await progress.context(ownerId, attempt.date, true);
  if (!Buffer.isBuffer(bytes)) v.fail("Send image bytes with a supported image Content-Type");
  const contentHash = hash(bytes);
  if (["ready", "attached"].includes(attempt.state)) {
    if (attempt.contentHash !== contentHash)
      throw new ApiError(409, "This upload attempt already contains another image");
    return response(attempt);
  }
  if (attempt.expiresAt < new Date())
    throw new ApiError(409, "Upload attempt expired. Start another upload.");
  const record = await Progress.findOne({
    ownerId,
    date: attempt.date,
    [`checkin.pending.${attempt.slot}`]: id,
  }).lean();
  if (!record) throw new ApiError(409, "This upload is no longer pending for that slot");
  const claimed = await Attempt.findOneAndUpdate(
    { ownerId, id, state: "issued" },
    { state: "uploading", contentHash, leaseUntil: new Date(Date.now() + 120000) }
  );
  if (!claimed)
    throw new ApiError(
      409,
      "Upload already in progress or expired. Retry or start another attempt."
    );
  try {
    const normalized = await provider.sanitize(bytes, mime);
    const result = provider.verify(await provider.upload(attempt.publicId, normalized), attempt);
    const verified = provider.verify(await provider.inspect(attempt.publicId), attempt);
    if (result.assetId !== verified.assetId)
      throw new ApiError(400, "Provider asset verification did not match");
    await require("../utils/session").assertCurrent();
    const saved = await Attempt.findOneAndUpdate(
      { ownerId, id, state: "uploading" },
      { state: "ready", verified, leaseUntil: null },
      { returnDocument: "after" }
    ).lean();
    if (!saved)
      throw new ApiError(409, "Upload expired before verification. Start another attempt.");
    return response(saved);
  } catch (err) {
    await Attempt.updateOne(
      { ownerId, id, state: "uploading" },
      { state: "cleanup", leaseUntil: null, nextCleanupAt: new Date(Date.now() + 10 * 60000) }
    );
    throw err instanceof ApiError
      ? err
      : new ApiError(502, "Private photo upload failed. Retry with a new attempt.");
  }
}
async function attach(ownerId, date, slot, body, key) {
  const ctx = await progress.context(ownerId, date, true);
  v.slot(slot);
  v.metadata(body, ["attemptId"], key);
  const attempt = await find(ownerId, body.attemptId);
  if (attempt.date !== ctx.date || attempt.slot !== slot)
    v.fail("Upload attempt does not match this date and slot");
  let replaced;
  const saved = await mutate(
    Progress,
    { ownerId, date: ctx.date },
    body,
    key,
    `attach:${slot}`,
    async (old) => {
      if (
        !old?.checkin.active ||
        old.checkin.pending[slot] !== attempt.id ||
        attempt.state !== "ready" ||
        attempt.expiresAt < new Date()
      )
        throw new ApiError(409, "This attempt cannot be attached. Reload or upload a new photo.");
      const verified = provider.verify(await provider.inspect(attempt.publicId), attempt);
      if (verified.assetId !== attempt.verified?.assetId)
        throw new ApiError(409, "Verified photo changed. Upload another image.");
      replaced = old.checkin.photos[slot]?.attemptId;
      return {
        checkin: {
          ...old.checkin,
          pending: { ...old.checkin.pending, [slot]: null },
          photos: { ...old.checkin.photos, [slot]: verified },
        },
      };
    }
  );
  // The record reference is authoritative even if this bookkeeping fails.
  await Attempt.updateOne({ ownerId, id: attempt.id, state: "ready" }, { state: "attached" });
  await Budget.updateOne({ ownerId }, { $pull: { pending: attempt.id } });
  if (replaced) await Attempt.updateOne({ ownerId, id: replaced }, { nextCleanupAt: new Date() });
  return progress.view(saved, ctx);
}
async function remove(ownerId, date, slot, body, key) {
  const ctx = await progress.context(ownerId, date, true);
  v.slot(slot);
  v.metadata(body, [], key);
  let removed = [];
  const saved = await mutate(
    Progress,
    { ownerId, date: ctx.date },
    body,
    key,
    `remove-photo:${slot}`,
    (old) => {
      if (!old?.checkin.active) throw new ApiError(404, "Check-in not found");
      removed = [old.checkin.photos[slot]?.attemptId, old.checkin.pending[slot]].filter(Boolean);
      return {
        checkin: {
          ...old.checkin,
          completedAt: null,
          pending: { ...old.checkin.pending, [slot]: null },
          photos: { ...old.checkin.photos, [slot]: null },
        },
      };
    }
  );
  await Attempt.updateMany({ ownerId, id: { $in: removed } }, { nextCleanupAt: new Date() });
  return progress.view(saved, ctx);
}
async function deliver(ownerId, date, slot, size) {
  const ctx = await progress.context(ownerId, date);
  v.slot(slot);
  if (!["original", "thumbnail"].includes(size)) v.fail("Invalid image size");
  const record = await Progress.findOne({ ownerId, date: ctx.date }).lean();
  const photo = record?.checkin.active && record.checkin.photos[slot];
  if (!photo) throw new ApiError(404, "Photo not found");
  const bytes = await provider.download(photo, size === "thumbnail");
  if (
    !(await Progress.exists({
      ownerId,
      date: ctx.date,
      "checkin.active": true,
      [`checkin.photos.${slot}.attemptId`]: photo.attemptId,
    }))
  )
    throw new ApiError(404, "Photo was removed or replaced");
  return bytes;
}
async function cleanup(limit = 100, now = new Date()) {
  const started = Date.now();
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new Error("Cleanup limit must be 1–100");
  const attempts = await Attempt.find({
    state: { $ne: "deleted" },
    nextCleanupAt: { $lte: now },
    $or: [{ leaseUntil: null }, { leaseUntil: { $lt: now } }],
  })
    .sort({ nextCleanupAt: 1 })
    .limit(limit)
    .lean();
  const counts = { deleted: 0, retained: 0, failed: 0 };
  for (const a of attempts) {
    if (Date.now() - started > 240000) break;
    try {
      const claim = await Attempt.findOneAndUpdate(
        {
          _id: a._id,
          state: a.state,
          nextCleanupAt: { $lte: now },
          $or: [{ leaseUntil: null }, { leaseUntil: { $lt: now } }],
        },
        { state: "cleanup", leaseUntil: new Date(now.getTime() + 120000) }
      );
      if (!claim) continue;
      if (["issued", "ready"].includes(a.state) && a.expiresAt > now &&
        await Progress.exists({ ownerId: a.ownerId, date: a.date, [`checkin.pending.${a.slot}`]: a.id })) {
        await Attempt.updateOne({ _id: a._id }, { state: a.state, leaseUntil: null, nextCleanupAt: a.expiresAt });
        counts.retained++;
        continue;
      }
      // Clearing the pending pointer increments the SAME record version used by attach.
      // Thus cleanup and an in-flight attachment cannot both win the record CAS.
      await Progress.updateOne(
        { ownerId: a.ownerId, date: a.date, [`checkin.pending.${a.slot}`]: a.id },
        { $set: { [`checkin.pending.${a.slot}`]: null }, $inc: { version: 1 } }
      );
      const used = await Progress.exists({
        ownerId: a.ownerId,
        date: a.date,
        [`checkin.photos.${a.slot}.attemptId`]: a.id,
      });
      if (used) {
        await Attempt.updateOne(
          { _id: a._id },
          {
            state: "attached",
            leaseUntil: null,
            nextCleanupAt: new Date(now.getTime() + 24 * 3600000),
          }
        );
        await Budget.updateOne({ ownerId: a.ownerId }, { $pull: { pending: a.id } });
        counts.retained++;
        continue;
      }
      await Attempt.updateOne({ _id: a._id }, { state: "cleanup" });
      await provider.destroy(a.publicId);
      await Budget.updateOne({ ownerId: a.ownerId }, { $pull: { pending: a.id } });
      await Attempt.updateOne(
        { _id: a._id },
        {
          state: "deleted",
          verified: null,
          leaseUntil: null,
          purgeAt: new Date(now.getTime() + 30 * 86400000),
        }
      );
      counts.deleted++;
    } catch {
      counts.failed++;
      await Attempt.updateOne(
        { _id: a._id },
        {
          $inc: { failures: 1 },
          $set: {
            leaseUntil: null,
            nextCleanupAt: new Date(
              now.getTime() + Math.min(86400000, 60000 * 2 ** Math.min(a.failures, 10))
            ),
          },
        }
      );
    }
  }
  return counts;
}
module.exports = { init, upload, attach, remove, deliver, cleanup };
