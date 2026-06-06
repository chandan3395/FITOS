"use strict";

/**
 * Pure validation for POST /api/workouts/client/:clientId and PATCH /api/workouts/:id payloads.
 *
 * Returns:
 *   { ok: true,  value }   — input passes validation; `value` is the cleaned
 *                            payload (trimmed strings, parsed numbers).
 *   { ok: false, errors }  — `errors` is `{ fieldName: "message" }`.
 *
 * The validator is intentionally framework-agnostic so it can be unit-tested
 * without booting Express or Mongoose.
 *
 * The contract is the source of truth for HTTP semantics — the service layer
 * should never decide "is this exercise name valid" on its own.
 */

const STATUSES = new Set(["DRAFT", "ACTIVE", "ARCHIVED"]);
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

/** Field range table — single source of truth. */
const RANGES = {
  durationWeeks: { min: 1,   max: 52 },
  sets:          { min: 1,   max: 20 },
  reps:          { min: 1,   max: 100 },
  weight:        { min: 0 }, // no max, but reasonable limit could be added
  restSeconds:   { min: 0,   max: 600 },
  dayNumber:     { min: 1 },
  order:         { min: 1 }
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

function inRange(n, { min, max }) {
  if (typeof n !== "number" || !Number.isFinite(n)) return false;
  if (typeof min === "number" && n < min) return false;
  if (typeof max === "number" && n > max) return false;
  return true;
}

/**
 * Validate a single exercise object
 * @param exercise raw exercise object from req.body.exercises[i]
 * @param opts { partial?: boolean } — when true, missing required fields are ignored (used by PATCH)
 * @returns {{ ok: true, value: Object } | { ok: false, errors: { fieldName: "message" } }}
 */
function validateExercise(exercise, opts = {}) {
  const partial = !!opts.partial;
  const errors  = {};
  const value   = {};

  if (!exercise || typeof exercise !== "object") {
    return { ok: false, errors: { _root: "Exercise must be an object." } };
  }

  if (isPresent(exercise._id)) {
    const id = String(exercise._id).trim();
    if (!OBJECT_ID_RE.test(id)) errors._id = "Exercise id is invalid.";
    else value._id = id;
  }

  // ── name (required) ───────────────────────────────────────
  if (!isPresent(exercise.name)) {
    if (!partial) errors.name = "Exercise name is required.";
  } else {
    const name = String(exercise.name).trim();
    if (name.length < 2)       errors.name = "Exercise name must be at least 2 characters.";
    else if (name.length > 200) errors.name = "Exercise name is too long.";
    else                        value.name = name;
  }

  // ── sets (optional, range-checked) ───────────────────────
  if (isPresent(exercise.sets)) {
    const n = asNumber(exercise.sets);
    if (n === null || !Number.isInteger(n) || !inRange(n, RANGES.sets))
      errors.sets = `Sets must be an integer between ${RANGES.sets.min} and ${RANGES.sets.max}.`;
    else value.sets = n;
  }

  // ── reps (optional, range-checked) ───────────────────────
  if (isPresent(exercise.reps)) {
    const n = asNumber(exercise.reps);
    if (n === null || !Number.isInteger(n) || !inRange(n, RANGES.reps))
      errors.reps = `Reps must be an integer between ${RANGES.reps.min} and ${RANGES.reps.max}.`;
    else value.reps = n;
  }

  // ── weight (optional, range-checked) ─────────────────────
  if (isPresent(exercise.weight)) {
    const n = asNumber(exercise.weight);
    if (n === null || !inRange(n, RANGES.weight))
      errors.weight = `Weight must be a number >= ${RANGES.weight.min}.`;
    else value.weight = n;
  }

  // ── restSeconds (optional, range-checked) ────────────────
  if (isPresent(exercise.restSeconds)) {
    const n = asNumber(exercise.restSeconds);
    if (n === null || !Number.isInteger(n) || !inRange(n, RANGES.restSeconds))
      errors.restSeconds = `Rest seconds must be an integer between ${RANGES.restSeconds.min} and ${RANGES.restSeconds.max}.`;
    else value.restSeconds = n;
  }

  // ── dayNumber (optional, range-checked) ─────────────────
  if (isPresent(exercise.dayNumber)) {
    const n = asNumber(exercise.dayNumber);
    if (n === null || !Number.isInteger(n) || !inRange(n, RANGES.dayNumber))
      errors.dayNumber = `Day number must be an integer >= ${RANGES.dayNumber.min}.`;
    else value.dayNumber = n;
  }

  // ── order (optional, range-checked) ─────────────────────
  if (isPresent(exercise.order)) {
    const n = asNumber(exercise.order);
    if (n === null || !Number.isInteger(n) || !inRange(n, RANGES.order))
      errors.order = `Order must be an integer >= ${RANGES.order.min}.`;
    else value.order = n;
  }

  // ── notes (optional string) ─────────────────────────────
  if (isPresent(exercise.notes)) {
    const notes = String(exercise.notes).trim();
    if (notes.length > 1000) errors.notes = "Notes must be 1000 characters or fewer.";
    else if (notes.length > 0) value.notes = notes;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}

/**
 * @param body  raw payload from req.body
 * @param opts  { partial?: boolean }  — when true, missing required fields
 *              are ignored (used by PATCH).
 */
function validateWorkoutPayload(body, opts = {}) {
  const partial = !!opts.partial;
  const errors  = {};
  const value   = {};

  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _root: "Request body must be an object." } };
  }

  // ── planName (required) ───────────────────────────────────
  if (!isPresent(body.planName)) {
    if (!partial) errors.planName = "Plan name is required.";
  } else {
    const planName = String(body.planName).trim();
    if (planName.length < 2)       errors.planName = "Plan name must be at least 2 characters.";
    else if (planName.length > 200) errors.planName = "Plan name is too long.";
    else                        value.planName = planName;
  }

  // ── goal (optional string) ───────────────────────────────
  if (isPresent(body.goal)) {
    const goal = String(body.goal).trim();
    if (goal.length > 200) errors.goal = "Goal is too long.";
    else                   value.goal = goal;
  }

  // ── durationWeeks (optional, range-checked) ──────────────
  if (isPresent(body.durationWeeks)) {
    const n = asNumber(body.durationWeeks);
    if (n === null || !Number.isInteger(n) || !inRange(n, RANGES.durationWeeks))
      errors.durationWeeks = `Duration weeks must be an integer between ${RANGES.durationWeeks.min} and ${RANGES.durationWeeks.max}.`;
    else value.durationWeeks = n;
  }

  // ── notes (optional string) ─────────────────────────────
  if (isPresent(body.notes)) {
    const notes = String(body.notes).trim();
    if (notes.length > 2000) errors.notes = "Notes must be 2000 characters or fewer.";
    else if (notes.length > 0) value.notes = notes;
  }

  // ── status (optional enum — only used by PATCH) ───────────
  if (isPresent(body.status)) {
    const status = String(body.status).trim().toUpperCase();
    if (!STATUSES.has(status)) errors.status = "Status must be DRAFT, ACTIVE or ARCHIVED.";
    else                       value.status = status;
  }

  // ── exercises (optional array) ───────────────────────────
  if (isPresent(body.exercises)) {
    if (!Array.isArray(body.exercises)) {
      errors.exercises = "Exercises must be an array.";
    } else {
      const validatedExercises = [];
      let hasError = false;

      for (let i = 0; i < body.exercises.length; i++) {
        const exerciseResult = validateExercise(body.exercises[i]);
        if (!exerciseResult.ok) {
          hasError = true;
          // Prefix errors with exercise index
          for (const [field, message] of Object.entries(exerciseResult.errors)) {
            if (field === "_root") {
              errors[`exercises[${i}]`] = message;
            } else {
              errors[`exercises[${i}].${field}`] = message;
            }
          }
        } else {
          validatedExercises.push(exerciseResult.value);
        }
      }

      if (!hasError) {
        value.exercises = validatedExercises;
      }
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}

module.exports = {
  validateWorkoutPayload,
  validateExercise,
  RANGES,
  STATUSES
};
