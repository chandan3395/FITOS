"use strict";
const { randomUUID } = require("crypto");
const ApiError = require("../utils/ApiError");
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const fail = (message) => {
  throw new ApiError(400, message);
};
function object(value, keys) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key))
  )
    fail("Unexpected fields or invalid object");
}
function text(value, max, label, required = false) {
  if (value === undefined && !required) return "";
  if (typeof value !== "string" || value.length > max || (required && !value.trim()))
    fail(`${label} must be ${required ? "non-empty text" : "text"} of at most ${max} characters`);
  return value.trim();
}
function number(value, min, max, label, integer = false) {
  if (value == null) return null;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value)) ||
    (!integer && Math.abs(value * 100 - Math.round(value * 100)) > 1e-7)
  )
    fail(
      `Invalid ${label}: use ${min}–${max}${integer ? " as a whole number" : " with at most two decimals"}`
    );
  return value;
}
function metadata(body, keys, key) {
  object(body, ["version", ...keys]);
  if (!Number.isSafeInteger(body.version) || body.version < 0)
    fail("A non-negative version is required");
  if (typeof key !== "string" || !UUID.test(key)) fail("A UUID v4 Idempotency-Key is required");
}
function localDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1900-01-01")
    fail("Use a valid local date (YYYY-MM-DD), from 1900 onward");
  const parsed = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value)
    fail("Invalid calendar date");
  return value;
}
const weekday = (date) => DAYS[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7];
const emptyDays = () =>
  DAYS.map((day) => ({ day, label: "", kind: "unconfigured", exercises: [] }));
function days(values, previous = []) {
  if (!Array.isArray(values) || values.length !== 7) fail("Provide exactly Monday through Sunday");
  const seen = new Set();
  let count = 0;
  return DAYS.map((day) => {
    const matches = values.filter((value) => value?.day === day);
    if (matches.length !== 1) fail("Each weekday must occur exactly once");
    const value = matches[0];
    object(value, ["day", "label", "kind", "exercises"]);
    if (!["unconfigured", "workout", "rest"].includes(value.kind))
      fail("Choose workout, rest or unconfigured");
    if (
      !Array.isArray(value.exercises) ||
      value.exercises.length > 30 ||
      (count += value.exercises.length) > 120
    )
      fail("Maximum 30 exercises per day and 120 per week");
    if (value.kind !== "workout" && value.exercises.length)
      fail("Rest and unconfigured days cannot contain exercises");
    const old = previous.find((item) => item.day === day);
    return {
      day,
      label: text(value.label, 80, "Day label"),
      kind: value.kind,
      exercises: value.exercises.map((entry) => {
        object(entry, ["id", "name", "sets", "reps", "weightKg", "restSeconds", "notes"]);
        if (typeof entry.id !== "string" || seen.has(entry.id)) fail("Exercise IDs must be unique");
        seen.add(entry.id);
        const draft = entry.id.startsWith("draft:") && UUID.test(entry.id.slice(6));
        if (!draft && (!UUID.test(entry.id) || !old?.exercises.some((e) => e.id === entry.id)))
          fail("Exercise ID does not belong to this day");
        return {
          id: draft ? randomUUID() : entry.id,
          name: text(entry.name, 120, "Exercise name", true),
          sets: number(entry.sets, 1, 100, "sets", true),
          reps: text(entry.reps, 80, "Reps"),
          weightKg: number(entry.weightKg, 0, 1500, "weight (kg)"),
          restSeconds: number(entry.restSeconds, 0, 3600, "rest seconds", true),
          notes: text(entry.notes, 500, "Notes"),
        };
      }),
    };
  });
}
module.exports = { DAYS, UUID, fail, text, metadata, localDate, weekday, emptyDays, days };
