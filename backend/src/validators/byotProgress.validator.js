"use strict";
const ApiError = require("../utils/ApiError");
const { FIELDS } = require("../schemas/ByotProgress.schema");
const { localDate, metadata, UUID } = require("./byotWorkout.validator");
const SLOTS = ["front", "side", "back"];
const fail = (message) => {
  throw new ApiError(400, message);
};
function object(value, keys) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !keys.includes(k))
  )
    fail("Unexpected fields or invalid object");
}
function measurements(value, required = true) {
  object(value, FIELDS);
  const result = Object.fromEntries(
    FIELDS.map((key) => {
      const n = value[key] ?? null;
      const min =
        key === "weightKg" ? 20 : key.includes("Arm") ? 5 : key.includes("Thigh") ? 10 : 20;
      const max =
        key === "weightKg" ? 500 : key.includes("Arm") ? 100 : key.includes("Thigh") ? 150 : 300;
      if (
        n !== null &&
        (typeof n !== "number" ||
          !Number.isFinite(n) ||
          n < min ||
          n > max ||
          Math.abs(n * 100 - Math.round(n * 100)) > 1e-7)
      )
        fail(`${key} must be ${min}–${max}, with at most two decimals`);
      return [key, n];
    })
  );
  if (required && !Object.values(result).some((n) => n !== null))
    fail("Enter at least one weight or body measurement");
  return result;
}
function notes(value = "") {
  if (typeof value !== "string" || value.length > 1000)
    fail("Notes must be text of at most 1000 characters");
  return value.trim();
}
function slot(value) {
  if (!SLOTS.includes(value)) fail("Choose front, side or back");
  return value;
}
function pagination(query) {
  object(query, ["before", "from", "limit", "checkins"]);
  const limit = query.limit === undefined ? 50 : Number(query.limit);
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    (query.limit !== undefined && !/^\d+$/.test(query.limit))
  )
    fail("Limit must be 1–100");
  if (query.checkins !== undefined && query.checkins !== "true") fail("Invalid check-in filter");
  return {
    limit,
    before: query.before === undefined ? null : localDate(query.before),
    from: query.from === undefined ? null : localDate(query.from),
    checkins: query.checkins === "true",
  };
}
module.exports = {
  FIELDS,
  SLOTS,
  UUID,
  fail,
  object,
  metadata,
  localDate,
  measurements,
  notes,
  slot,
  pagination,
};
