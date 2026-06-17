#!/usr/bin/env node
"use strict";

/**
 * migrateWorkoutSetDetailsV2.js
 *
 * Workout Plan v2 adds optional per-set `setDetails` to each exercise. Flat
 * (legacy) exercises keep READING fine without any migration. This OPTIONAL,
 * one-shot script EXPANDS a flat exercise into setDetails — N identical rows
 * (N = the exercise's `sets`) populated from the flat weight/reps/restSeconds —
 * for trainers who want existing plans/templates to start carrying per-set data.
 *
 * Safety:
 *   - Idempotent & safe to rerun: only exercises that have `sets >= 1` and NO
 *     existing setDetails are expanded; a second run touches nothing.
 *   - Never alters flat fields or any other data.
 *   - NOT auto-run. Invoke explicitly:
 *
 *       node scripts/migrateWorkoutSetDetailsV2.js [--dry]
 *       npm run migrate:workout-v2
 *
 *   --dry  reports what WOULD change without writing.
 */

const mongoose = require("mongoose");

// Loads backend/.env and exposes env (MONGO_URI). We don't call validateEnv()
// so the script doesn't demand unrelated vars (Cloudinary/OAuth/...).
require("../src/config/env");
const connectDB = require("../src/config/database");
const { WorkoutPlan } = require("../src/schemas/WorkoutPlan.schema");
const { WorkoutTemplate } = require("../src/schemas/WorkoutTemplate.schema");

const DRY = process.argv.includes("--dry");

function expandFlatExercise(ex) {
  const n = Number(ex.sets) || 0;
  if (n <= 0) return null;
  const rows = [];
  for (let i = 1; i <= n; i++) {
    rows.push({
      setNumber: i,
      weight: ex.weight != null ? ex.weight : 0,
      reps: ex.reps != null ? ex.reps : 0,
      restSeconds: ex.restSeconds != null ? ex.restSeconds : 0,
    });
  }
  return rows;
}

async function migrateModel(label, Model) {
  const docs = await Model.find({}); // hydrate so subdoc paths cast correctly
  let docsChanged = 0;
  let exercisesExpanded = 0;

  for (const doc of docs) {
    let dirty = false;
    for (const ex of doc.exercises || []) {
      const already = Array.isArray(ex.setDetails) && ex.setDetails.length > 0;
      if (already) continue;
      const rows = expandFlatExercise(ex);
      if (!rows) continue;
      exercisesExpanded += 1;
      dirty = true;
      if (!DRY) ex.setDetails = rows;
    }
    if (dirty) {
      docsChanged += 1;
      if (!DRY) await doc.save();
    }
  }

  console.log(
    `[migrate] ${label}: ${DRY ? "WOULD expand" : "expanded"} ${exercisesExpanded} exercise(s) ` +
    `across ${docsChanged} document(s).`
  );
}

async function main() {
  await connectDB();
  try {
    console.log(`[migrate] Workout set-details v2 ${DRY ? "(dry run)" : ""}`.trim());
    await migrateModel("WorkoutPlan", WorkoutPlan);
    await migrateModel("WorkoutTemplate", WorkoutTemplate);
    console.log("[migrate] ✅ Done.");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("[migrate] Failed:", err.message);
  process.exit(1);
});
