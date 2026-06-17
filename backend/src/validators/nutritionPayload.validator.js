"use strict";

/**
 * Pure validation for nutrition plan create / patch payloads. Returns
 *   { ok: true,  value }   — cleaned payload (trimmed strings, parsed numbers)
 *   { ok: false, errors }  — `{ fieldName: "message" }`
 *
 * Framework-agnostic so it can be unit-tested without Express or Mongoose.
 */

const { validateSchedule } = require("./scheduleValidator");

const STATUSES = new Set(["DRAFT", "ACTIVE", "ARCHIVED"]);

const RANGES = {
  calories:    { min: 800, max: 6000 },
  protein:     { min: 20,  max: 500  },
  carbs:       { min: 20,  max: 1000 },
  fats:        { min: 10,  max: 300  },
  waterTarget: { min: 0.5, max: 10   },
  mealsPerDay: { min: 1,   max: 8,   integer: true },
  cheatMeals:  { min: 0,   max: 7,   integer: true },
};

function isPresent(v) {
  return v !== undefined && v !== null && v !== "";
}

function asNumber(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function checkNumberField(out, errors, key, raw) {
  const spec = RANGES[key];
  const n = asNumber(raw);
  if (n === null) {
    errors[key] = `${key} must be a number.`;
    return;
  }
  if (spec.integer && !Number.isInteger(n)) {
    errors[key] = `${key} must be an integer.`;
    return;
  }
  if (n < spec.min || n > spec.max) {
    errors[key] = `${key} must be between ${spec.min} and ${spec.max}.`;
    return;
  }
  out[key] = n;
}

function checkStringField(out, errors, key, raw, max) {
  const s = String(raw).trim();
  if (s.length > max) {
    errors[key] = `${key} must be ${max} characters or fewer.`;
    return;
  }
  if (s.length > 0) out[key] = s;
}

function validateNutritionPayload(body, opts = {}) {
  const partial = !!opts.partial;
  const errors  = {};
  const value   = {};

  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _root: "Request body must be an object." } };
  }

  // ── planName (required on create) ─────────────────────────
  if (!isPresent(body.planName)) {
    if (!partial) errors.planName = "Plan name is required.";
  } else {
    const planName = String(body.planName).trim();
    if (planName.length < 2)       errors.planName = "Plan name must be at least 2 characters.";
    else if (planName.length > 200) errors.planName = "Plan name is too long.";
    else                            value.planName = planName;
  }

  // ── notes (optional) ──────────────────────────────────────
  if (isPresent(body.notes)) checkStringField(value, errors, "notes", body.notes, 2000);

  // ── status (optional enum) ────────────────────────────────
  if (isPresent(body.status)) {
    const status = String(body.status).trim().toUpperCase();
    if (!STATUSES.has(status)) errors.status = "Status must be DRAFT, ACTIVE or ARCHIVED.";
    else                       value.status = status;
  }

  // ── Numeric macro / target fields ─────────────────────────
  for (const key of Object.keys(RANGES)) {
    if (isPresent(body[key])) checkNumberField(value, errors, key, body[key]);
  }

  // ── String preference fields ──────────────────────────────
  if (isPresent(body.dietType))       checkStringField(value, errors, "dietType",       body.dietType,       60);
  if (isPresent(body.foodAvoidances)) checkStringField(value, errors, "foodAvoidances", body.foodAvoidances, 1000);
  if (isPresent(body.eatingHabits))   checkStringField(value, errors, "eatingHabits",   body.eatingHabits,   2000);

  // ── Weekly schedule (optional; structure validated, meal-count enforced on
  //    publish in the service layer). Absent schedule = legacy flat plan. ──
  if (body.schedule !== undefined) {
    const { value: schedule, errors: scheduleErrors } = validateSchedule(body.schedule);
    if (Object.keys(scheduleErrors).length > 0) Object.assign(errors, scheduleErrors);
    else value.schedule = schedule;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}

module.exports = { validateNutritionPayload, RANGES, STATUSES };
