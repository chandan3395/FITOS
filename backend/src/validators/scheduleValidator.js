"use strict";

/**
 * Pure validator for a nutrition plan/template weekly `schedule`.
 *
 * Returns { value, errors } where:
 *   value  — cleaned schedule array (trimmed dishes, parsed numbers)
 *   errors — { "<path>": "message" }  (empty object === valid)
 *
 * DRAFT-friendly: a day may have FEWER than mealsPerDay meals here. The
 * "exactly mealsPerDay" rule is enforced at PUBLISH time in the service layer
 * (see utils/nutritionTotals.scheduleMealCountErrors).
 *
 * Per-meal macros use sane per-MEAL caps (NOT the plan-level daily ranges):
 *   calories 0..5000, protein 0..500, carbs 0..1000, fats 0..500.
 */

const { WEEKDAYS, MEAL_TYPES, MACRO_KEYS } = require("../utils/nutritionTotals");

const PER_MEAL_RANGES = {
  calories: { min: 0, max: 5000 },
  protein:  { min: 0, max: 500 },
  carbs:    { min: 0, max: 1000 },
  fats:     { min: 0, max: 500 },
};

const WEEKDAY_SET = new Set(WEEKDAYS);
const MEAL_TYPE_SET = new Set(MEAL_TYPES);
const MAX_DISHES = 30;
const MAX_DISH_LEN = 100;

function asNumber(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function cleanDishes(raw, path, errors) {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    errors[`${path}.dishes`] = "dishes must be an array of strings.";
    return [];
  }
  const out = [];
  for (const d of raw) {
    if (typeof d !== "string") {
      errors[`${path}.dishes`] = "Each dish must be a string.";
      return [];
    }
    const s = d.trim();
    if (s.length === 0) continue;
    if (s.length > MAX_DISH_LEN) {
      errors[`${path}.dishes`] = `Each dish must be ${MAX_DISH_LEN} characters or fewer.`;
      return [];
    }
    out.push(s);
  }
  if (out.length > MAX_DISHES) {
    errors[`${path}.dishes`] = `A meal may have at most ${MAX_DISHES} dishes.`;
    return [];
  }
  return out;
}

function cleanMeal(raw, path, errors) {
  const meal = {};
  if (!raw || typeof raw !== "object") {
    errors[path] = "Each meal must be an object.";
    return null;
  }

  const mealType = String(raw.mealType || "").trim();
  if (!MEAL_TYPE_SET.has(mealType)) {
    errors[`${path}.mealType`] = `mealType must be one of: ${MEAL_TYPES.join(", ")}.`;
  } else {
    meal.mealType = mealType;
  }

  meal.dishes = cleanDishes(raw.dishes, path, errors);

  for (const key of MACRO_KEYS) {
    const spec = PER_MEAL_RANGES[key];
    if (raw[key] === undefined || raw[key] === null || raw[key] === "") {
      meal[key] = 0; // unset macro counts as 0 toward totals
      continue;
    }
    const n = asNumber(raw[key]);
    if (n === null) {
      errors[`${path}.${key}`] = `${key} must be a number.`;
    } else if (n < spec.min || n > spec.max) {
      errors[`${path}.${key}`] = `${key} must be between ${spec.min} and ${spec.max}.`;
    } else {
      meal[key] = n;
    }
  }

  return meal;
}

/**
 * Validate a `schedule` array. Caller decides whether schedule is required.
 */
function validateSchedule(raw) {
  const errors = {};
  if (!Array.isArray(raw)) {
    return { value: undefined, errors: { schedule: "schedule must be an array." } };
  }

  const value = [];
  const seenDays = new Set();

  raw.forEach((rawDay, i) => {
    const path = `schedule[${i}]`;
    if (!rawDay || typeof rawDay !== "object") {
      errors[path] = "Each day must be an object.";
      return;
    }

    const day = String(rawDay.day || "").trim();
    if (!WEEKDAY_SET.has(day)) {
      errors[`${path}.day`] = `day must be one of: ${WEEKDAYS.join(", ")}.`;
      return;
    }
    if (seenDays.has(day)) {
      errors[`${path}.day`] = `Duplicate day "${day}" — each weekday may appear at most once.`;
      return;
    }
    seenDays.add(day);

    const rawMeals = rawDay.meals === undefined ? [] : rawDay.meals;
    if (!Array.isArray(rawMeals)) {
      errors[`${path}.meals`] = "meals must be an array.";
      return;
    }

    const meals = [];
    rawMeals.forEach((rawMeal, j) => {
      const meal = cleanMeal(rawMeal, `${path}.meals[${j}]`, errors);
      if (meal) meals.push(meal);
    });

    value.push({ day, meals });
  });

  return { value, errors };
}

module.exports = { validateSchedule, PER_MEAL_RANGES, MAX_DISHES, MAX_DISH_LEN };
