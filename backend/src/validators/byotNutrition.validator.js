"use strict";
const { randomUUID } = require("crypto");
const ApiError = require("../utils/ApiError");
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const KEYS = ["calories", "protein", "carbs", "fats"];
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const fail = (message) => {
  throw new ApiError(400, message);
};
function object(value, allowed) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !allowed.includes(key))
  )
    fail("Unexpected or malformed nutrition fields");
}
function text(value, max, label) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    fail(`${label} must contain 1–${max} characters`);
  return value.trim();
}
function number(value, max, label) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > max ||
    Math.abs(value * 100 - Math.round(value * 100)) > 0.000001
  )
    fail(`${label} must be 0–${max}, with at most two decimal places`);
  return Math.round(value * 100) / 100;
}
function target(value) {
  if (value === null) return null;
  object(value, KEYS);
  const result = {};
  for (const key of KEYS)
    result[key] =
      value[key] == null ? null : number(value[key], key === "calories" ? 30000 : 5000, key);
  return KEYS.every((key) => result[key] === null) ? null : result;
}
function localDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < "1900-01-01" ||
    value > "9999-12-31"
  )
    fail("Use a valid local calendar date (YYYY-MM-DD, from 1900)");
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    fail("Invalid calendar date");
  return value;
}
function weekday(date) {
  return DAYS[(new Date(`${localDate(date)}T12:00:00Z`).getUTCDay() + 6) % 7];
}
function metadata(body, allowed, key) {
  object(body, ["version", ...allowed]);
  if (!Number.isSafeInteger(body.version) || body.version < 0)
    fail("A non-negative version is required");
  if (typeof key !== "string" || !UUID.test(key)) fail("A UUID Idempotency-Key is required");
}
// Persisted IDs may only refer to this document AND their existing parent.
// New/copy IDs are draft:<uuid>; the server always assigns fresh persisted IDs.
function meals(values, previous = [], seen = new Set(), count = { foods: 0 }) {
  if (!Array.isArray(values) || values.length > 12) fail("Use at most 12 meals per day");
  function id(value, existing) {
    if (typeof value !== "string" || seen.has(value)) fail("Duplicate or malformed nested ID");
    seen.add(value);
    if (value.startsWith("draft:") && UUID.test(value.slice(6))) return randomUUID();
    if (!UUID.test(value) || !existing)
      fail("Nested ID does not belong to this document and parent");
    return value;
  }
  return values.map((value) => {
    object(value, ["id", "name", "foods"]);
    const old = previous.find((meal) => meal.id === value.id);
    const mealId = id(value.id, old);
    if (!Array.isArray(value.foods) || value.foods.length > 20)
      fail("Use at most 20 foods per meal");
    return {
      id: mealId,
      name: text(value.name, 80, "Meal name"),
      foods: value.foods.map((food) => {
        if (++count.foods > 120) fail("Use at most 120 food entries per document");
        object(food, ["id", "name", "quantity", ...KEYS]);
        return {
          id: id(
            food.id,
            old?.foods.find((item) => item.id === food.id)
          ),
          name: text(food.name, 120, "Food name"),
          quantity: text(food.quantity, 100, "Quantity"),
          ...Object.fromEntries(
            KEYS.map((key) => [key, number(food[key], key === "calories" ? 10000 : 2000, key)])
          ),
        };
      }),
    };
  });
}
function days(values, previous = []) {
  if (!Array.isArray(values) || values.length !== 7) fail("Provide exactly Monday through Sunday");
  const seen = new Set();
  const count = { foods: 0 };
  return DAYS.map((day) => {
    const matches = values.filter((value) => value?.day === day);
    if (matches.length !== 1) fail("Each weekday must occur exactly once");
    const value = matches[0];
    object(value, ["day", "meals", "target"]);
    return {
      day,
      target: target(value.target),
      meals: meals(value.meals, previous.find((item) => item.day === day)?.meals, seen, count),
    };
  });
}
function totals(meals) {
  return Object.fromEntries(
    KEYS.map((key) => [
      key,
      meals.reduce(
        (sum, meal) =>
          sum + meal.foods.reduce((subtotal, food) => subtotal + Math.round(food[key] * 100), 0),
        0
      ) / 100,
    ])
  );
}
module.exports = { DAYS, KEYS, metadata, days, meals, target, localDate, weekday, totals };
