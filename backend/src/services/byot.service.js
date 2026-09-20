"use strict";
const { ByotProfile } = require("../schemas/ByotProfile.schema");
const ApiError = require("../utils/ApiError");
async function ensureProfile(ownerId) {
  try {
    return await ByotProfile.findOneAndUpdate(
      { ownerId },
      { $setOnInsert: { ownerId } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
  } catch (err) {
    if (err.code === 11000) return ByotProfile.findOne({ ownerId });
    throw err;
  }
}
function validateOnboarding(body) {
  const allowed = ["startingWeightKg", "heightCm", "goal", "targetWeightKg", "timezone"];
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((k) => !allowed.includes(k))
  )
    throw new ApiError(400, "Only onboarding fields are allowed");
  const ranges = { startingWeightKg: [20, 500], heightCm: [80, 250], targetWeightKg: [20, 500] };
  for (const [key, [min, max]] of Object.entries(ranges)) {
    if (key === "targetWeightKg" && body[key] === undefined) continue;
    if (
      typeof body[key] !== "number" ||
      !Number.isFinite(body[key]) ||
      body[key] < min ||
      body[key] > max
    )
      throw new ApiError(400, `${key} must be between ${min} and ${max}`);
  }
  if (typeof body.goal !== "string" || !body.goal.trim() || body.goal.length > 200)
    throw new ApiError(400, "Enter a personal goal (1–200 characters)");
  if (typeof body.timezone !== "string" || body.timezone.length > 100 || !body.timezone)
    throw new ApiError(400, "Enter a valid timezone");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: body.timezone }).format();
  } catch {
    throw new ApiError(400, "Enter a valid IANA timezone");
  }
  return { ...body, goal: body.goal.trim() };
}
function localDate(now, timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function serialize(profile) {
  const p = profile.toObject();
  let nextCheckInDate = null;
  if (p.checkInAnchorDate) {
    const date = new Date(`${p.checkInAnchorDate}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 7);
    nextCheckInDate = date.toISOString().slice(0, 10);
  }
  return {
    startingWeightKg: p.startingWeightKg,
    heightCm: p.heightCm,
    goal: p.goal,
    targetWeightKg: p.targetWeightKg,
    timezone: p.timezone,
    onboardingCompletedAt: p.onboardingCompletedAt,
    checkInAnchorDate: p.checkInAnchorDate,
    nextCheckInDate,
  };
}
async function onboard(ownerId, body) {
  const fields = validateOnboarding(body);
  await ensureProfile(ownerId);
  const now = new Date();
  const profile = await ByotProfile.findOneAndUpdate(
    { ownerId, onboardingCompletedAt: null },
    {
      $set: {
        ...fields,
        onboardingCompletedAt: now,
        checkInAnchorDate: localDate(now, fields.timezone),
      },
    },
    { returnDocument: "after" }
  );
  return profile || ByotProfile.findOne({ ownerId });
}
module.exports = { ensureProfile, validateOnboarding, localDate, serialize, onboard };
