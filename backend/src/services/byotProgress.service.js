"use strict";
const {
  ByotProgress: Progress,
  ByotPhotoAttempt: Attempt,
} = require("../schemas/ByotProgress.schema");
const { ByotProfile } = require("../schemas/ByotProfile.schema");
const { localDate } = require("./byot.service");
const clock = require("../utils/byotClock");
const mutate = require("../utils/byotMutation");
const v = require("../validators/byotProgress.validator");
const provider = require("./byotMediaProvider");
const ApiError = require("../utils/ApiError");
const blankCheckin = () => ({
  active: false,
  completedAt: null,
  photos: { front: null, side: null, back: null },
  pending: { front: null, side: null, back: null },
});
async function context(ownerId, date, write = false) {
  const profile = await ByotProfile.findOne({ ownerId }).lean();
  if (!profile?.onboardingCompletedAt) throw new ApiError(409, "Complete BYOT onboarding first");
  const today = localDate(clock.now(), profile.timezone);
  date = date === undefined ? today : v.localDate(date);
  if (write && date > today) v.fail("Future progress and check-in dates are not allowed");
  return { today, date, timezone: profile.timezone, profile };
}
function view(record, ctx) {
  const measurements = record?.measurements || v.measurements({}, false);
  const checkin = record?.checkin || blankCheckin();
  return {
    date: record?.date || ctx.date,
    today: ctx.today,
    timezone: ctx.timezone,
    timezoneAtCreation: record?.timezoneAtCreation || null,
    version: record?.version || 0,
    exists: Boolean(checkin.active || Object.values(measurements).some((n) => n != null)),
    measurements,
    notes: record?.notes || "",
    checkin: {
      active: checkin.active,
      completed: Boolean(checkin.completedAt),
      photos: Object.fromEntries(
        v.SLOTS.map((slot) => [
          slot,
          checkin.photos[slot]
            ? {
                id: checkin.photos[slot].attemptId,
                width: checkin.photos[slot].width,
                height: checkin.photos[slot].height,
              }
            : null,
        ])
      ),
    },
  };
}
async function read(ownerId, date) {
  const ctx = await context(ownerId, date);
  return view(await Progress.findOne({ ownerId, date: ctx.date }).lean(), ctx);
}
async function history(ownerId, query) {
  const ctx = await context(ownerId);
  const p = v.pagination(query);
  const filter = {
    ownerId,
    $or: [
      { "checkin.active": true },
      ...v.FIELDS.map((k) => ({ [`measurements.${k}`]: { $ne: null } })),
    ],
  };
  if (p.checkins) {
    delete filter.$or;
    filter["checkin.active"] = true;
  }
  if (p.before || p.from)
    filter.date = { ...(p.before ? { $lt: p.before } : {}), ...(p.from ? { $gte: p.from } : {}) };
  const rows = await Progress.find(filter)
    .sort({ date: -1 })
    .limit(p.limit + 1)
    .lean();
  return {
    today: ctx.today,
    items: rows.slice(0, p.limit).map((row) => view(row, ctx)),
    next: rows.length > p.limit ? rows[p.limit - 1].date : null,
  };
}
function addDays(date, n) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
async function summary(ownerId) {
  const ctx = await context(ownerId);
  const [weight, completed] = await Promise.all([
    Progress.findOne({ ownerId, "measurements.weightKg": { $ne: null } })
      .sort({ date: -1 })
      .lean(),
    Progress.findOne({ ownerId, "checkin.active": true, "checkin.completedAt": { $ne: null } })
      .sort({ date: -1 })
      .lean(),
  ]);
  const nextDueDate = addDays(completed?.date || ctx.profile.checkInAnchorDate, 7);
  const state =
    nextDueDate < ctx.today ? "overdue" : nextDueDate === ctx.today ? "due" : "upcoming";
  return {
    today: ctx.today,
    timezone: ctx.timezone,
    baseline: { date: ctx.profile.checkInAnchorDate, weightKg: ctx.profile.startingWeightKg },
    targetWeightKg: ctx.profile.targetWeightKg ?? null,
    latestWeight: weight ? { date: weight.date, weightKg: weight.measurements.weightKg } : null,
    changeKg:
      weight && ctx.profile.startingWeightKg != null
        ? Math.round((weight.measurements.weightKg - ctx.profile.startingWeightKg) * 100) / 100
        : null,
    latestCompletedDate: completed?.date || null,
    nextDueDate,
    state,
    reminder:
      state === "due"
        ? "Your check-in is due today."
        : state === "overdue"
          ? `You missed your check-in on ${nextDueDate}. Please check in.`
          : `Your next check-in is on ${nextDueDate}.`,
  };
}
async function save(ownerId, date, body, key, draft = false) {
  const ctx = await context(ownerId, date, true);
  v.metadata(body, ["measurements", "notes"], key);
  const values = v.measurements(body.measurements, !draft);
  const notes = v.notes(body.notes);
  const result = await mutate(
    Progress,
    { ownerId, date: ctx.date },
    body,
    key,
    draft ? "draft" : "measurements",
    (old) => {
      const checkin = old?.checkin || blankCheckin();
      if (draft) checkin.active = true;
      if (values.weightKg === null) checkin.completedAt = null;
      return {
        measurements: values,
        notes,
        checkin,
        ...(!old ? { timezoneAtCreation: ctx.timezone } : {}),
      };
    }
  );
  return view(result, ctx);
}
async function remove(ownerId, date, body, key, checkinOnly = false) {
  const ctx = await context(ownerId, date, true);
  v.metadata(body, checkinOnly ? ["deleteMeasurements"] : [], key);
  if (body.deleteMeasurements !== undefined && typeof body.deleteMeasurements !== "boolean")
    v.fail("Invalid measurement deletion choice");
  let removed = [];
  const result = await mutate(
    Progress,
    { ownerId, date: ctx.date },
    body,
    key,
    checkinOnly ? "delete-checkin" : "delete-measurements",
    (old) => {
      if (!old) throw new ApiError(404, "Progress record not found");
      const checkin = checkinOnly ? blankCheckin() : { ...old.checkin, completedAt: null };
      if (checkinOnly)
        removed = v.SLOTS.flatMap((slot) => [
          old.checkin.photos[slot]?.attemptId,
          old.checkin.pending[slot],
        ]).filter(Boolean);
      return {
        checkin,
        ...(!checkinOnly || body.deleteMeasurements
          ? { measurements: v.measurements({}, false), notes: "" }
          : {}),
      };
    }
  );
  await Attempt.updateMany({ ownerId, id: { $in: removed } }, { nextCleanupAt: new Date() });
  return view(result, ctx);
}
async function complete(ownerId, date, body, key) {
  const ctx = await context(ownerId, date, true);
  v.metadata(body, [], key);
  const result = await mutate(
    Progress,
    { ownerId, date: ctx.date },
    body,
    key,
    "complete",
    async (old) => {
      if (
        !old?.checkin.active ||
        old.measurements.weightKg == null ||
        v.SLOTS.some((s) => !old.checkin.photos[s])
      )
        throw new ApiError(
          409,
          "A saved weight and verified Front, Side and Back photos are required"
        );
      await Promise.all(
        v.SLOTS.map(async (slot) => {
          const photo = old.checkin.photos[slot];
          const verified = provider.verify(await provider.inspect(photo.publicId), {
            publicId: photo.publicId,
            id: photo.attemptId,
          });
          if (verified.assetId !== photo.assetId)
            throw new ApiError(
              409,
              "A photo changed at the provider. Replace it before completing."
            );
        })
      );
      return { checkin: { ...old.checkin, completedAt: old.checkin.completedAt || clock.now() } };
    }
  );
  return view(result, ctx);
}
module.exports = { context, view, read, history, summary, save, remove, complete, blankCheckin };
