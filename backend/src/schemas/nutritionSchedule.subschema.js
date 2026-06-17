"use strict";

const mongoose = require("mongoose");

/**
 * Shared sub-schemas for the structured weekly nutrition `schedule`, reused by
 * both NutritionPlan and NutritionTemplate so the two stay in lock-step.
 *
 * Per-meal macros are ONLY calories/protein/carbs/fats (+ dishes). Daily
 * targets are NOT stored — they are computed as the SUM of a day's meals
 * (see utils/nutritionTotals). Plan-level fields (waterTarget, dietType,
 * cheatMeals, foodAvoidances, eatingHabits) stay on the parent document.
 *
 * `schedule` is optional everywhere: a legacy flat plan simply has an empty
 * schedule and continues to use the flat macro fields on the parent.
 */

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"];

const mealSchema = new mongoose.Schema(
  {
    mealType: { type: String, enum: MEAL_TYPES, required: true },
    dishes:   [{ type: String, trim: true, maxlength: 100 }],
    // Sane per-MEAL caps (not the plan-level daily ranges). Default 0 so an
    // unset macro counts as zero toward computed daily totals.
    calories: { type: Number, min: 0, max: 5000, default: 0 },
    protein:  { type: Number, min: 0, max: 500,  default: 0 },
    carbs:    { type: Number, min: 0, max: 1000, default: 0 },
    fats:     { type: Number, min: 0, max: 500,  default: 0 },
  },
  { _id: true }
);

const daySchema = new mongoose.Schema(
  {
    day:   { type: String, enum: WEEKDAYS, required: true },
    meals: { type: [mealSchema], default: [] },
  },
  { _id: true }
);

module.exports = { daySchema, mealSchema, WEEKDAYS, MEAL_TYPES };
