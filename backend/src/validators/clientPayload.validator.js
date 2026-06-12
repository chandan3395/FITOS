"use strict";

/**
 * Pure validation for POST /api/clients and PATCH /api/clients/:id payloads.
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
 * should never decide "is this email valid" on its own.
 */

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RX = /^[0-9+\s\-()]{7,20}$/;
const GENDERS  = new Set(["MALE", "FEMALE", "OTHER"]);
const STATUSES = new Set(["PENDING", "ACTIVE", "ARCHIVED"]);

/** Field range table — single source of truth. */
const RANGES = {
  age:            { min: 1,   max: 120 },
  height:         { min: 80,  max: 250 },
  startingWeight: { min: 20,  max: 300 },
  targetWeight:   { min: 20,  max: 300 },
  bodyFat:        { min: 1,   max: 60  },
  targetBodyFat:  { min: 1,   max: 60  },
  calories:       { min: 800, max: 6000 },
  protein:        { min: 20,  max: 500 },
  carbs:          { min: 20,  max: 1000 },
  fats:           { min: 10,  max: 300 },
  mealsPerDay:    { min: 1,   max: 8   },
  waterTarget:    { min: 0.5, max: 10  },
  cheatMeals:     { min: 0,   max: 7   },
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
  return typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
}

/**
 * @param body  raw payload from req.body
 * @param opts  { partial?: boolean }  — when true, missing required fields
 *              are ignored (used by PATCH).
 */
function validateClientPayload(body, opts = {}) {
  const partial = !!opts.partial;
  const errors  = {};
  const value   = {};

  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _root: "Request body must be an object." } };
  }

  // ── name ──────────────────────────────────────────────────────
  if (!isPresent(body.name)) {
    if (!partial) errors.name = "Name is required.";
  } else {
    const name = String(body.name).trim();
    if (name.length < 2)       errors.name = "Name must be at least 2 characters.";
    else if (name.length > 200) errors.name = "Name is too long.";
    else                        value.name = name;
  }

  // ── phone ─────────────────────────────────────────────────────
  if (!isPresent(body.phone)) {
    if (!partial) errors.phone = "Phone is required.";
  } else {
    const phone = String(body.phone).trim();
    if (!PHONE_RX.test(phone)) errors.phone = "Phone must be 7–20 chars; digits, spaces, +, -, () only.";
    else                       value.phone = phone;
  }

  // ── email (required) ──────────────────────────────────────────
  // In the Google-only model a client signs in with Google and is matched
  // by email, so a real email is mandatory at intake — without it the
  // client could never be matched and would be locked out. (PATCH/partial
  // updates only validate format when the field is present.)
  if (!isPresent(body.email)) {
    if (!partial) errors.email = "Email is required.";
  } else {
    const email = String(body.email).trim().toLowerCase();
    if (!EMAIL_RX.test(email)) errors.email = "Enter a valid email address.";
    else                       value.email = email;
  }

  // ── gender (optional, enum-checked) ───────────────────────────
  if (isPresent(body.gender)) {
    const gender = String(body.gender).trim().toUpperCase();
    if (!GENDERS.has(gender)) errors.gender = "Gender must be MALE, FEMALE, or OTHER.";
    else                      value.gender = gender;
  }

  // ── age (optional, integer range) ─────────────────────────────
  if (isPresent(body.age)) {
    const age = asNumber(body.age);
    if (age === null || !Number.isInteger(age) || !inRange(age, RANGES.age))
      errors.age = `Age must be an integer between ${RANGES.age.min} and ${RANGES.age.max}.`;
    else value.age = age;
  }

  // ── city (optional string) ────────────────────────────────────
  if (isPresent(body.city)) {
    const city = String(body.city).trim();
    if (city.length > 120) errors.city = "City is too long.";
    else                   value.city = city;
  }

  // ── occupation (optional string) ──────────────────────────────
  if (isPresent(body.occupation)) {
    const occ = String(body.occupation).trim();
    if (occ.length > 200) errors.occupation = "Occupation is too long.";
    else                  value.occupation = occ;
  }

  // ── dob (optional date) — backend authoritatively derives age ─
  if (isPresent(body.dob)) {
    const d = new Date(body.dob);
    if (isNaN(d.getTime()) || d > new Date()) {
      errors.dob = "Date of birth must be a valid past date.";
    } else {
      value.dob = d;
      // If the caller didn't send age, compute it from dob so the two
      // are always consistent in the persisted document.
      if (!isPresent(body.age)) {
        const years = Math.floor((Date.now() - d.getTime()) / 31557600000);
        if (years >= 1 && years <= 120) value.age = years;
      }
    }
  }

  // ── height (required, range-checked) ──────────────────────────
  if (!isPresent(body.height)) {
    if (!partial) errors.height = "Height is required.";
  } else {
    const n = asNumber(body.height);
    if (n === null || !inRange(n, RANGES.height))
      errors.height = `Height must be a number between ${RANGES.height.min} and ${RANGES.height.max} cm.`;
    else value.height = n;
  }

  // ── startingWeight (required, range-checked) ──────────────────
  if (!isPresent(body.startingWeight)) {
    if (!partial) errors.startingWeight = "Starting weight is required.";
  } else {
    const n = asNumber(body.startingWeight);
    if (n === null || !inRange(n, RANGES.startingWeight))
      errors.startingWeight = `Starting weight must be a number between ${RANGES.startingWeight.min} and ${RANGES.startingWeight.max} kg.`;
    else value.startingWeight = n;
  }

  // ── targetWeight (required, range-checked) ────────────────────
  if (!isPresent(body.targetWeight)) {
    if (!partial) errors.targetWeight = "Target weight is required.";
  } else {
    const n = asNumber(body.targetWeight);
    if (n === null || !inRange(n, RANGES.targetWeight))
      errors.targetWeight = `Target weight must be a number between ${RANGES.targetWeight.min} and ${RANGES.targetWeight.max} kg.`;
    else value.targetWeight = n;
  }

  // ── goal (required) ───────────────────────────────────────────
  if (!isPresent(body.goal)) {
    if (!partial) errors.goal = "Primary goal is required.";
  } else {
    const goal = String(body.goal).trim();
    if (goal.length < 2)       errors.goal = "Goal must be at least 2 characters.";
    else if (goal.length > 200) errors.goal = "Goal is too long.";
    else                        value.goal = goal;
  }

  // ── status (optional enum — only used by PATCH) ───────────────
  if (isPresent(body.status)) {
    const status = String(body.status).trim().toUpperCase();
    if (!STATUSES.has(status)) errors.status = "Status must be PENDING, ACTIVE, or ARCHIVED.";
    else                       value.status = status;
  }

  // ── Optional nutritional / body-comp fields (validated when present)
  // These aren't stored by the current Client schema, but the backend
  // still rejects bad values so a malformed payload never silently
  // succeeds. Once the schema grows, these become first-class.
  for (const k of ["bodyFat", "targetBodyFat", "calories", "protein", "carbs", "fats", "mealsPerDay", "waterTarget", "cheatMeals"]) {
    if (!isPresent(body[k])) continue;
    const n = asNumber(body[k]);
    const range = RANGES[k];
    if (n === null || !inRange(n, range)) {
      errors[k] = `${k} must be a number between ${range.min} and ${range.max}.`;
    } else if (k === "mealsPerDay" || k === "cheatMeals") {
      if (!Number.isInteger(n)) errors[k] = `${k} must be a whole number.`;
      else                       value[k] = n;
    } else {
      value[k] = n;
    }
  }

  // ── Goal-program fields (optional metadata; format-checked) ───
  if (isPresent(body.timeline)) {
    const t = String(body.timeline).trim();
    if (t.length === 0 || t.length > 60) errors.timeline = "Timeline is invalid.";
    else                                  value.timeline = t;
  }
  if (isPresent(body.goalDescription)) {
    const d = String(body.goalDescription).trim();
    if (d.length < 20)        errors.goalDescription = "Goal description must be at least 20 characters.";
    else if (d.length > 2000) errors.goalDescription = "Goal description is too long.";
    else                      value.goalDescription = d;
  }
  if (isPresent(body.startDate)) {
    const d = new Date(body.startDate);
    if (isNaN(d.getTime())) errors.startDate = "Start date must be a valid date.";
    else                    value.startDate = d.toISOString();
  }
  if (isPresent(body.duration)) {
    const t = String(body.duration).trim();
    if (t.length === 0 || t.length > 60) errors.duration = "Duration is invalid.";
    else                                  value.duration = t;
  }
  if (isPresent(body.sessionFrequency)) {
    const t = String(body.sessionFrequency).trim();
    if (t.length === 0 || t.length > 60) errors.sessionFrequency = "Session frequency is invalid.";
    else                                  value.sessionFrequency = t;
  }
  if (isPresent(body.diet)) {
    const t = String(body.diet).trim();
    if (t.length === 0 || t.length > 60) errors.diet = "Diet type is invalid.";
    else                                  value.diet = t;
  }

  // ── Free-text fields with length caps ─────────────────────────
  // Health, dietary preferences, and trainer-private notes.
  const TEXT_LIMITS = {
    medicalConditions: 1000,
    medications:       1000,
    pastInjuries:      1000,
    allergies:         1000,
    foodDislikes:      1000,
    eatingHabits:      2000,
    privateNotes:      4000,
  };
  for (const [field, max] of Object.entries(TEXT_LIMITS)) {
    if (!isPresent(body[field])) continue;
    const text = String(body[field]).trim();
    if (text.length > max) {
      errors[field] = `${field} must be ${max} characters or fewer.`;
    } else if (text.length > 0) {
      value[field] = text;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}

module.exports = {
  validateClientPayload,
  RANGES,
  EMAIL_RX,
  PHONE_RX,
};
