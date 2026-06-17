"use strict";

const mongoose = require("mongoose");
const { daySchema } = require("./nutritionSchedule.subschema");

const NUTRITION_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"];

/**
 * Nutrition plan assigned to a client.
 *
 * Mirrors the WorkoutPlan lifecycle (DRAFT/ACTIVE/ARCHIVED). Macro ranges
 * match the Client onboarding validator so a plan promoted from onboarding
 * defaults is always within the same bounds.
 *
 * Range bounds mirror `validators/nutritionPayload.validator.js`. The
 * validator is the authority for input validation; the schema constraints
 * are a defense-in-depth backstop.
 */
const nutritionPlanSchema = new mongoose.Schema(
  {
    // ── Ownership ────────────────────────────────────────────
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true
    },

    // ── Plan details ─────────────────────────────────────────
    planName: { type: String, required: true, trim: true, maxlength: 200 },
    notes:    { type: String, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: NUTRITION_STATUSES,
      default: "DRAFT"
    },

    // ── Macros ───────────────────────────────────────────────
    calories:    { type: Number, min: 800, max: 6000 },
    protein:     { type: Number, min: 20,  max: 500  },
    carbs:       { type: Number, min: 20,  max: 1000 },
    fats:        { type: Number, min: 10,  max: 300  },
    waterTarget: { type: Number, min: 0.5, max: 10   },
    mealsPerDay: { type: Number, min: 1,   max: 8    },
    cheatMeals:  { type: Number, min: 0,   max: 7    },

    // ── Preferences ──────────────────────────────────────────
    dietType:        { type: String, trim: true, maxlength: 60   },
    foodAvoidances:  { type: String, trim: true, maxlength: 1000 },
    eatingHabits:    { type: String, trim: true, maxlength: 2000 },

    // ── Structured weekly schedule (v2; optional) ────────────
    // Daily macro targets are derived from these meals, never stored.
    // Empty for legacy flat plans, which keep the flat macro fields above.
    schedule: { type: [daySchema], default: [] },
  },
  { timestamps: true }
);

nutritionPlanSchema.index({ clientId: 1 });
nutritionPlanSchema.index({ clientId: 1, status: 1 });

const NutritionPlan = mongoose.model("NutritionPlan", nutritionPlanSchema);

module.exports = { NutritionPlan, NUTRITION_STATUSES };
