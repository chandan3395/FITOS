"use strict";

const mongoose = require("mongoose");
const { daySchema } = require("./nutritionSchedule.subschema");

const NUTRITION_TEMPLATE_STATUSES = ["ACTIVE", "ARCHIVED"];

/**
 * Nutrition templates — trainer-private macro blueprints.
 * Ranges mirror the NutritionPlan + its validator so a snapshot-on-assign
 * (future) can copy fields straight through without re-validation.
 */
const nutritionTemplateSchema = new mongoose.Schema(
  {
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    name:        { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    notes:       { type: String, trim: true, maxlength: 2000 },
    status:      { type: String, enum: NUTRITION_TEMPLATE_STATUSES, default: "ACTIVE" },

    calories:    { type: Number, min: 800, max: 6000 },
    protein:     { type: Number, min: 20,  max: 500  },
    carbs:       { type: Number, min: 20,  max: 1000 },
    fats:        { type: Number, min: 10,  max: 300  },
    waterTarget: { type: Number, min: 0.5, max: 10   },
    mealsPerDay: { type: Number, min: 1,   max: 8    },
    cheatMeals:  { type: Number, min: 0,   max: 7    },

    dietType:         { type: String, trim: true, maxlength: 60   },
    foodRestrictions: { type: String, trim: true, maxlength: 1000 },
    eatingHabits:     { type: String, trim: true, maxlength: 2000 },

    // ── Structured weekly schedule (v2; optional) ────────────
    // Snapshotted by value into a NutritionPlan on assign (no shared refs).
    schedule: { type: [daySchema], default: [] },
  },
  { timestamps: true }
);

nutritionTemplateSchema.index({ trainerId: 1, status: 1, updatedAt: -1 });

const NutritionTemplate = mongoose.model("NutritionTemplate", nutritionTemplateSchema);

module.exports = { NutritionTemplate, NUTRITION_TEMPLATE_STATUSES };
