"use strict";

// Pure validator for nutrition-template create / patch payloads.
// Same shape as nutritionPayload.validator but uses `name` (not `planName`),
// no status DRAFT, and a `foodRestrictions` field instead of the plan's
// `foodAvoidances` — the field naming follows the trainer-facing spec.

const { validateSchedule } = require("./scheduleValidator");

const STATUSES = new Set(["ACTIVE", "ARCHIVED"]);

const RANGES = {
  calories:    { min: 800, max: 6000 },
  protein:     { min: 20,  max: 500  },
  carbs:       { min: 20,  max: 1000 },
  fats:        { min: 10,  max: 300  },
  waterTarget: { min: 0.5, max: 10   },
  mealsPerDay: { min: 1,   max: 8,   integer: true },
  cheatMeals:  { min: 0,   max: 7,   integer: true },
};

const isPresent = (v) => v !== undefined && v !== null && v !== "";

function asNumber(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function checkNumber(out, errors, key, raw) {
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

function checkString(out, errors, key, raw, max) {
  const s = String(raw).trim();
  if (s.length > max) {
    errors[key] = `${key} must be ${max} characters or fewer.`;
    return;
  }
  if (s.length > 0) out[key] = s;
}

function validateNutritionTemplatePayload(body, opts = {}) {
  const partial = !!opts.partial;
  const errors = {};
  const value  = {};

  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _root: "Request body must be an object." } };
  }

  if (!isPresent(body.name)) {
    if (!partial) errors.name = "Template name is required.";
  } else {
    const name = String(body.name).trim();
    if (name.length < 2)        errors.name = "Template name must be at least 2 characters.";
    else if (name.length > 200) errors.name = "Template name is too long.";
    else                        value.name = name;
  }

  if (isPresent(body.description)) checkString(value, errors, "description", body.description, 2000);
  if (isPresent(body.notes))       checkString(value, errors, "notes",       body.notes,       2000);

  if (isPresent(body.status)) {
    const status = String(body.status).trim().toUpperCase();
    if (!STATUSES.has(status)) errors.status = "Status must be ACTIVE or ARCHIVED.";
    else                       value.status = status;
  }

  for (const key of Object.keys(RANGES)) {
    if (isPresent(body[key])) checkNumber(value, errors, key, body[key]);
  }

  if (isPresent(body.dietType))         checkString(value, errors, "dietType",         body.dietType,         60);
  if (isPresent(body.foodRestrictions)) checkString(value, errors, "foodRestrictions", body.foodRestrictions, 1000);
  if (isPresent(body.eatingHabits))     checkString(value, errors, "eatingHabits",     body.eatingHabits,     2000);

  // ── Weekly schedule (optional; same structure as plans). ──
  if (body.schedule !== undefined) {
    const { value: schedule, errors: scheduleErrors } = validateSchedule(body.schedule);
    if (Object.keys(scheduleErrors).length > 0) Object.assign(errors, scheduleErrors);
    else value.schedule = schedule;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}

module.exports = { validateNutritionTemplatePayload, RANGES, STATUSES };
