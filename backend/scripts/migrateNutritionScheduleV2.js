#!/usr/bin/env node
"use strict";

/**
 * migrateNutritionScheduleV2.js
 *
 * Nutrition Plan v2 introduces an optional `schedule` array on NutritionPlan
 * and NutritionTemplate. The Mongoose schema defaults it to `[]`, so existing
 * "flat" documents already READ correctly without any migration. This script
 * simply MATERIALIZES the field (sets `schedule: []`) on documents created
 * before v2 so the stored shape is explicit and queries on `schedule` behave
 * uniformly.
 *
 * Safety:
 *   - Idempotent & safe to rerun: only touches docs where `schedule` does not
 *     exist ({ $exists: false }); a second run matches nothing.
 *   - Never mutates flat macro fields or any other data.
 *   - NOT auto-run. Invoke explicitly:
 *
 *       node scripts/migrateNutritionScheduleV2.js [--dry]
 *       npm run migrate:nutrition-v2
 *
 *   --dry  prints what WOULD change without writing.
 */

const mongoose = require("mongoose");

// Loads backend/.env and exposes env (MONGO_URI). We do not call validateEnv()
// so the script doesn't demand unrelated vars (Cloudinary/OAuth/...).
require("../src/config/env");
const connectDB = require("../src/config/database");
const { NutritionPlan } = require("../src/schemas/NutritionPlan.schema");
const { NutritionTemplate } = require("../src/schemas/NutritionTemplate.schema");

const DRY = process.argv.includes("--dry");

async function migrateModel(label, Model) {
  const filter = { schedule: { $exists: false } };
  const count = await Model.countDocuments(filter);

  if (DRY) {
    console.log(`[migrate] ${label}: ${count} document(s) WOULD get schedule: []`);
    return count;
  }

  if (count === 0) {
    console.log(`[migrate] ${label}: already up to date (0 changes).`);
    return 0;
  }

  const res = await Model.updateMany(filter, { $set: { schedule: [] } });
  console.log(`[migrate] ${label}: set schedule: [] on ${res.modifiedCount} document(s).`);
  return res.modifiedCount;
}

async function main() {
  await connectDB();
  try {
    console.log(`[migrate] Nutrition schedule v2 ${DRY ? "(dry run)" : ""}`.trim());
    await migrateModel("NutritionPlan", NutritionPlan);
    await migrateModel("NutritionTemplate", NutritionTemplate);
    console.log("[migrate] ✅ Done.");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("[migrate] Failed:", err.message);
  process.exit(1);
});
