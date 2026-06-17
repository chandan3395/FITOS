"use strict";

/**
 * Pure validator for an exercise's `setDetails` array (Workout Plan v2).
 *
 * Returns { value, errors } where:
 *   value  — cleaned setDetails (parsed numbers, auto setNumber)
 *   errors — { "<path>": "message" }  (empty object === valid)
 *
 * DRAFT-friendly: a set may be incomplete here (e.g. reps 0). The "reps >= 1
 * on every set" rule is enforced at PUBLISH time in the service layer
 * (see utils/workoutSets.setDetailsPublishErrors).
 *
 * Per-set bounds: weight >= 0, reps 0..100, restSeconds 0..600, setNumber >= 1.
 */

const MAX_SETS = 20; // mirrors the exercise `sets` max

const isPresent = (v) => v !== undefined && v !== null && v !== "";

function asNumber(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function checkInt(out, errors, key, raw, path, { min, max }) {
  const n = asNumber(raw);
  if (n === null || !Number.isInteger(n) || n < min || (max != null && n > max)) {
    errors[`${path}.${key}`] = `${key} must be an integer between ${min} and ${max ?? "∞"}.`;
    return;
  }
  out[key] = n;
}

function validateSetDetails(raw) {
  const errors = {};
  if (!Array.isArray(raw)) {
    return { value: undefined, errors: { setDetails: "setDetails must be an array." } };
  }
  if (raw.length > MAX_SETS) {
    return { value: undefined, errors: { setDetails: `An exercise may have at most ${MAX_SETS} sets.` } };
  }

  const value = [];
  raw.forEach((rawSet, i) => {
    const path = `setDetails[${i}]`;
    if (!rawSet || typeof rawSet !== "object") {
      errors[path] = "Each set must be an object.";
      return;
    }
    const set = {};

    // setNumber — defaults to the 1-indexed position when omitted.
    if (isPresent(rawSet.setNumber)) {
      const n = asNumber(rawSet.setNumber);
      if (n === null || !Number.isInteger(n) || n < 1) {
        errors[`${path}.setNumber`] = "setNumber must be an integer >= 1.";
      } else {
        set.setNumber = n;
      }
    } else {
      set.setNumber = i + 1;
    }

    // weight — number >= 0 (default 0 when omitted).
    if (isPresent(rawSet.weight)) {
      const n = asNumber(rawSet.weight);
      if (n === null || n < 0) errors[`${path}.weight`] = "weight must be a number >= 0.";
      else set.weight = n;
    } else {
      set.weight = 0;
    }

    // reps / restSeconds — integers within range (default 0 when omitted).
    if (isPresent(rawSet.reps)) checkInt(set, errors, "reps", rawSet.reps, path, { min: 0, max: 100 });
    else set.reps = 0;
    if (isPresent(rawSet.restSeconds)) checkInt(set, errors, "restSeconds", rawSet.restSeconds, path, { min: 0, max: 600 });
    else set.restSeconds = 0;

    value.push(set);
  });

  return { value, errors };
}

module.exports = { validateSetDetails, MAX_SETS };
