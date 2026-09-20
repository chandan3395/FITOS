"use strict";
const mongoose = require("mongoose");
const options = { _id: false, strict: "throw" };
const nutrients = { calories: Number, protein: Number, carbs: Number, fats: Number };
const target = new mongoose.Schema(nutrients, options);
const food = new mongoose.Schema(
  { id: String, name: String, quantity: String, ...nutrients },
  options
);
const meal = new mongoose.Schema({ id: String, name: String, foods: [food] }, options);
const day = new mongoose.Schema(
  { day: String, meals: [meal], target: { type: target, default: null } },
  options
);
const receipt = new mongoose.Schema({ key: String, hash: String }, options);
const common = {
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
  version: { type: Number, required: true },
  receipts: { type: [receipt], default: [], select: false },
};
const planSchema = new mongoose.Schema(
  { ...common, days: [day], deleted: { type: Boolean, default: false } },
  { timestamps: true, strict: "throw" }
);
planSchema.index({ ownerId: 1 }, { unique: true });
const logSchema = new mongoose.Schema(
  {
    ...common,
    date: { type: String, required: true, immutable: true },
    meals: [meal],
    target: { type: target, default: null },
    targetSource: { type: String, enum: ["current", "manual", "none"], required: true },
    timezoneAtCreation: { type: String, required: true, immutable: true },
  },
  { timestamps: true, strict: "throw" }
);
logSchema.index({ ownerId: 1, date: 1 }, { unique: true });
module.exports = {
  ByotNutritionPlan: mongoose.model("ByotNutritionPlan", planSchema),
  ByotFoodLog: mongoose.model("ByotFoodLog", logSchema),
};
