"use strict";

// Pure validator for workout-template create / patch payloads.
// Mirrors the structure of workoutPayload.validator but with template-
// specific fields (name + description instead of planName + goal) and a
// reduced status set (no DRAFT).

const { validateSetDetails } = require("./setDetailsValidator");

const STATUSES = new Set(["ACTIVE", "ARCHIVED"]);
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

const RANGES = {
  durationWeeks: { min: 1, max: 52 },
  sets:          { min: 1, max: 20 },
  reps:          { min: 1, max: 100 },
  weight:        { min: 0 },
  restSeconds:   { min: 0, max: 600 },
  dayNumber:     { min: 1 },
  order:         { min: 1 },
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

function inRange(n, { min, max }) {
  if (typeof n !== "number" || !Number.isFinite(n)) return false;
  if (typeof min === "number" && n < min) return false;
  if (typeof max === "number" && n > max) return false;
  return true;
}

function validateExercise(exercise) {
  const errors = {};
  const value  = {};
  if (!exercise || typeof exercise !== "object") {
    return { ok: false, errors: { _root: "Exercise must be an object." } };
  }

  if (isPresent(exercise._id)) {
    const id = String(exercise._id).trim();
    if (!OBJECT_ID_RE.test(id)) errors._id = "Exercise id is invalid.";
    else value._id = id;
  }

  if (!isPresent(exercise.name)) {
    errors.name = "Exercise name is required.";
  } else {
    const name = String(exercise.name).trim();
    if (name.length < 2)        errors.name = "Exercise name must be at least 2 characters.";
    else if (name.length > 200) errors.name = "Exercise name is too long.";
    else                        value.name = name;
  }

  for (const key of ["sets", "reps", "weight", "restSeconds", "dayNumber", "order"]) {
    if (!isPresent(exercise[key])) continue;
    const n = asNumber(exercise[key]);
    const spec = RANGES[key];
    const mustInt = key !== "weight";
    if (n === null || (mustInt && !Number.isInteger(n)) || !inRange(n, spec)) {
      errors[key] = `${key} must be a${mustInt ? "n integer" : " number"} within range.`;
    } else {
      value[key] = n;
    }
  }

  if (isPresent(exercise.notes)) {
    const notes = String(exercise.notes).trim();
    if (notes.length > 1000) errors.notes = "Notes must be 1000 characters or fewer.";
    else if (notes.length > 0) value.notes = notes;
  }

  // setDetails (optional v2 per-set array)
  if (isPresent(exercise.setDetails)) {
    const { value: sd, errors: sdErrors } = validateSetDetails(exercise.setDetails);
    if (Object.keys(sdErrors).length) Object.assign(errors, sdErrors);
    else value.setDetails = sd;
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value };
}

function validateWorkoutTemplatePayload(body, opts = {}) {
  const partial = !!opts.partial;
  const errors  = {};
  const value   = {};

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

  if (isPresent(body.description)) {
    const d = String(body.description).trim();
    if (d.length > 2000) errors.description = "Description is too long.";
    else if (d.length > 0) value.description = d;
  }

  if (isPresent(body.durationWeeks)) {
    const n = asNumber(body.durationWeeks);
    if (n === null || !Number.isInteger(n) || !inRange(n, RANGES.durationWeeks))
      errors.durationWeeks = "Duration weeks must be 1–52.";
    else value.durationWeeks = n;
  }

  if (isPresent(body.notes)) {
    const n = String(body.notes).trim();
    if (n.length > 2000) errors.notes = "Notes must be 2000 characters or fewer.";
    else if (n.length > 0) value.notes = n;
  }

  if (isPresent(body.status)) {
    const status = String(body.status).trim().toUpperCase();
    if (!STATUSES.has(status)) errors.status = "Status must be ACTIVE or ARCHIVED.";
    else                       value.status = status;
  }

  if (isPresent(body.exercises)) {
    if (!Array.isArray(body.exercises)) {
      errors.exercises = "Exercises must be an array.";
    } else {
      const out = [];
      let hadError = false;
      for (let i = 0; i < body.exercises.length; i++) {
        const res = validateExercise(body.exercises[i]);
        if (!res.ok) {
          hadError = true;
          for (const [k, m] of Object.entries(res.errors)) {
            errors[k === "_root" ? `exercises[${i}]` : `exercises[${i}].${k}`] = m;
          }
        } else {
          out.push(res.value);
        }
      }
      if (!hadError) value.exercises = out;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}

module.exports = { validateWorkoutTemplatePayload, RANGES, STATUSES };
