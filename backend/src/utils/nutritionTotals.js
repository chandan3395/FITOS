"use strict";

/**
 * Pure, framework-agnostic helpers for the structured (weekly) nutrition plan.
 *
 * Daily targets are NEVER stored — they are the SUM of a day's meals, computed
 * here as the single source of truth. "Consumed" macros for a logged day are
 * the SUM of that day's entries whose status === "reviewed" (a trainer must
 * approve a meal before it counts).
 *
 * No Mongoose / Express here so this can be unit-tested directly.
 */

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"];
const MACRO_KEYS = ["calories", "protein", "carbs", "fats"];

function zeroMacros() {
  return { calories: 0, protein: 0, carbs: 0, fats: 0 };
}

/** Coerce a possibly-missing numeric macro to a finite number (0 fallback). */
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Sum an array of macro-bearing objects into a single {calories,protein,carbs,fats}. */
function sumMacros(items) {
  return (items || []).reduce((acc, m) => {
    for (const k of MACRO_KEYS) acc[k] += num(m && m[k]);
    return acc;
  }, zeroMacros());
}

/** Total macros for one day = sum of its meals. */
function dayTotals(day) {
  return sumMacros(day && day.meals ? day.meals : []);
}

/** Weekly totals = sum across every day's totals. */
function weeklyTotals(schedule) {
  return sumMacros((schedule || []).map(dayTotals));
}

/**
 * Consumed macros for a logged day = sum of plannedMacros across entries whose
 * status === "reviewed". Pending / action_required entries do NOT count.
 */
function consumedFromEntries(entries) {
  return sumMacros(
    (entries || [])
      .filter((e) => e && e.status === "reviewed")
      .map((e) => e.plannedMacros || {})
  );
}

/**
 * Publish validation (pure): `mealsPerDay` is a CEILING, not a fixed count. A
 * populated day may have anywhere from 1 up to `mealsPerDay` meals; only days
 * that EXCEED the cap are invalid. Days with zero meals are allowed (a plan may
 * cover only some weekdays). Returns the list of offending (over-cap) days so
 * the caller can build a precise error message; empty array === valid.
 */
function scheduleMealCountErrors(schedule, mealsPerDay) {
  const bad = [];
  for (const day of schedule || []) {
    const count = (day && day.meals ? day.meals : []).length;
    if (count > mealsPerDay) {
      bad.push({ day: day.day, count });
    }
  }
  return bad;
}

/**
 * JS Date → weekday name in our Monday-first WEEKDAYS vocabulary.
 * `getUTCDay()` returns 0=Sunday..6=Saturday; we map to our list.
 */
function weekdayOf(date) {
  const idx = date.getUTCDay(); // 0 Sun .. 6 Sat
  return idx === 0 ? "Sunday" : WEEKDAYS[idx - 1];
}

module.exports = {
  WEEKDAYS,
  MEAL_TYPES,
  MACRO_KEYS,
  zeroMacros,
  sumMacros,
  dayTotals,
  weeklyTotals,
  consumedFromEntries,
  scheduleMealCountErrors,
  weekdayOf,
};
