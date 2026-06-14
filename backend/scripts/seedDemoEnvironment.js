#!/usr/bin/env node
"use strict";

/**
 * seedDemoEnvironment.js
 *
 * Builds (and repairs) the permanent FITOS demo environment so the deployed
 * site always has a believable, fully-populated trainer + client to explore.
 *
 *   Demo trainer : demo.trainer@fitos.com / demo.trainer.fitos@143  (TRAINER)
 *   Demo client  : demo.client@fitos.com  / demo.client.fitos@143   (CLIENT)
 *
 * Both accounts log in with email + password via POST /api/auth/login
 * (no Google OAuth required) and are flagged isDemoAccount + isProtected so
 * they cannot be accidentally disabled (trainer) or deleted (client).
 *
 * What it creates:
 *   - 1 demo trainer (login account)
 *   - 1 demo client  (login account) linked to the trainer
 *   - 10 additional demo clients (profiles only — they populate the trainer's
 *     roster and dashboard; they have no login)
 *   - For every demo client: 2 workout plans (1 ACTIVE + 1 ARCHIVED),
 *     2 nutrition plans (1 ACTIVE + 1 ARCHIVED), ~30 days of check-ins,
 *     workout completions (historical adherence), and a backdated activity feed
 *
 * Photos (progress + meal) are intentionally skipped for now.
 *
 * ── Safety / idempotency ──────────────────────────────────────────────────
 *   - Re-runnable. Every run rebuilds demo-owned data to a deterministic state.
 *   - Strictly scoped: it only ever touches users/clients flagged
 *     isDemoAccount and the data owned by them. It NEVER modifies, overwrites,
 *     or deletes real users or real customer data.
 *   - Refuses to touch an account that already exists at a demo email but is
 *     NOT a demo account (won't clobber a real user that happens to collide).
 *
 *   Usage:  node scripts/seedDemoEnvironment.js
 *      or:  npm run seed:demo   (from backend/)
 */

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

// `config/env` loads backend/.env and exposes `env`. We use env.MONGO_URI but
// intentionally do NOT call validateEnv() so this script doesn't demand
// unrelated vars (Cloudinary, OAuth, ...).
require("../src/config/env");
const connectDB = require("../src/config/database");

const { User } = require("../src/schemas/User.schema");
const { Client } = require("../src/schemas/Client.schema");
const { WorkoutPlan } = require("../src/schemas/WorkoutPlan.schema");
const { WorkoutCompletion } = require("../src/schemas/WorkoutCompletion.schema");
const { NutritionPlan } = require("../src/schemas/NutritionPlan.schema");
const { CheckIn } = require("../src/schemas/CheckIn.schema");
const { ActivityLog } = require("../src/schemas/ActivityLog.schema");

const BCRYPT_COST = 12; // matches auth.controller.js

// ── Demo account constants ──────────────────────────────────────────────────
const DEMO_TRAINER = {
  name: "Alex Morgan",
  email: "demo.trainer@fitos.com",
  password: "demo.trainer.fitos@143",
};
const DEMO_CLIENT = {
  name: "Jordan Lee",
  email: "demo.client@fitos.com",
  password: "demo.client.fitos@143",
};

// ── Deterministic PRNG (mulberry32) ──────────────────────────────────────────
// Seeded so reruns produce stable-looking data.
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const randInt = (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min;
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const round1 = (n) => Math.round(n * 10) / 10;

const DAY_MS = 86_400_000;
const now = Date.now();
const daysAgo = (d, jitterMs = 0) => new Date(now - d * DAY_MS + jitterMs);

// ── Client roster ─────────────────────────────────────────────────────────
// The primary (linked) demo client is index 0. The remaining 10 are
// profile-only. `attention: true` marks clients whose last check-in is > 7
// days old, so the trainer dashboard's "Attention Required" panel is realistic.
const GOALS = ["Fat Loss", "Muscle Gain", "Recomposition", "Strength", "Endurance"];

const ROSTER = [
  { name: "Jordan Lee",       gender: "OTHER",  goal: "Recomposition", primary: true },
  { name: "Priya Sharma",     gender: "FEMALE", goal: "Fat Loss" },
  { name: "Marcus Chen",      gender: "MALE",   goal: "Muscle Gain" },
  { name: "Sofia Rossi",      gender: "FEMALE", goal: "Strength" },
  { name: "David Okafor",     gender: "MALE",   goal: "Fat Loss",      attention: true },
  { name: "Emma Thompson",    gender: "FEMALE", goal: "Endurance" },
  { name: "Liam Patel",       gender: "MALE",   goal: "Recomposition" },
  { name: "Nina Volkov",      gender: "FEMALE", goal: "Muscle Gain" },
  { name: "Carlos Mendes",    gender: "MALE",   goal: "Strength",      attention: true },
  { name: "Aisha Khan",       gender: "FEMALE", goal: "Fat Loss" },
  { name: "Tom Becker",       gender: "MALE",   goal: "Endurance" },
];
const ROSTER_NAMES = ROSTER.map((c) => c.name);

// ── Exercise library by training day ────────────────────────────────────────
// Days 1-6 carry work; day 7 (Sunday) is a rest day. todayDayNumber() in the
// client dashboard maps Mon=1..Sun=7, so any weekday has a session to show.
const SPLIT = [
  { day: 1, label: "Push", moves: [["Barbell Bench Press", 4, 8], ["Overhead Press", 3, 10], ["Incline Dumbbell Press", 3, 12], ["Triceps Pushdown", 3, 15]] },
  { day: 2, label: "Pull", moves: [["Deadlift", 4, 6], ["Pull-Ups", 4, 8], ["Barbell Row", 3, 10], ["Face Pull", 3, 15]] },
  { day: 3, label: "Legs", moves: [["Back Squat", 4, 8], ["Romanian Deadlift", 3, 10], ["Leg Press", 3, 12], ["Standing Calf Raise", 4, 15]] },
  { day: 4, label: "Upper", moves: [["Incline Bench Press", 4, 8], ["Lat Pulldown", 3, 12], ["Dumbbell Shoulder Press", 3, 10], ["Barbell Curl", 3, 12]] },
  { day: 5, label: "Lower", moves: [["Front Squat", 4, 8], ["Hip Thrust", 3, 12], ["Walking Lunge", 3, 12], ["Seated Calf Raise", 4, 15]] },
  { day: 6, label: "Conditioning", moves: [["Kettlebell Swing", 4, 20], ["Rowing Intervals", 5, 1], ["Plank", 3, 1]] },
];

function buildExercises(rng) {
  const exercises = [];
  for (const block of SPLIT) {
    block.moves.forEach(([name, sets, reps], i) => {
      exercises.push({
        _id: new mongoose.Types.ObjectId(),
        name,
        sets,
        reps,
        weight: name.includes("Plank") || name.includes("Rowing") ? 0 : randInt(rng, 20, 120),
        restSeconds: pick(rng, [60, 90, 120, 150]),
        dayNumber: block.day,
        order: i + 1,
        notes: i === 0 ? `${block.label} day — focus on controlled tempo.` : "",
      });
    });
  }
  return exercises;
}

function nutritionFor(goal, rng) {
  // Macro presets per goal, all within NutritionPlan schema bounds.
  const base = {
    "Fat Loss":      { calories: 1700, protein: 150, carbs: 140, fats: 55 },
    "Muscle Gain":   { calories: 2900, protein: 190, carbs: 320, fats: 80 },
    "Recomposition": { calories: 2200, protein: 180, carbs: 200, fats: 65 },
    "Strength":      { calories: 2700, protein: 175, carbs: 290, fats: 78 },
    "Endurance":     { calories: 2500, protein: 140, carbs: 300, fats: 70 },
  }[goal] || { calories: 2200, protein: 160, carbs: 220, fats: 65 };
  return {
    ...base,
    waterTarget: round1(2.5 + rng()),
    mealsPerDay: randInt(rng, 3, 5),
    cheatMeals: randInt(rng, 1, 2),
    dietType: pick(rng, ["Balanced", "High Protein", "Mediterranean", "Flexible"]),
  };
}

async function upsertDemoUser({ name, email, password, role }) {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing && !existing.isDemoAccount) {
    throw new Error(
      `Refusing to modify ${normalizedEmail}: an existing NON-demo account uses this email.`
    );
  }
  const hashed = await bcrypt.hash(password, BCRYPT_COST);
  const user = await User.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $set: {
        name,
        email: normalizedEmail,
        password: hashed,
        role,
        isActive: true,
        isDemoAccount: true,
        isProtected: true,
        googleLinked: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return user;
}

async function main() {
  await connectDB();
  try {
    console.log("[seed] Building FITOS demo environment…");

    // 1) Login accounts ─────────────────────────────────────────────────────
    const trainer = await upsertDemoUser({ ...DEMO_TRAINER, role: "TRAINER" });
    const clientUser = await upsertDemoUser({ ...DEMO_CLIENT, role: "CLIENT" });
    console.log(`[seed] Trainer ${trainer.email} (${trainer._id})`);
    console.log(`[seed] Client  ${clientUser.email} (${clientUser._id})`);

    // 2) Client profiles ────────────────────────────────────────────────────
    // Remove any stale demo clients (from a previous roster) that are NOT in
    // the current set and NOT protected — keeps reseeds clean without ever
    // touching real clients or the protected linked demo client.
    await Client.deleteMany({
      trainerId: trainer._id,
      isDemoAccount: true,
      isProtected: { $ne: true },
      name: { $nin: ROSTER_NAMES },
    });

    const clients = [];
    for (let i = 0; i < ROSTER.length; i++) {
      const spec = ROSTER[i];
      const rng = makeRng(1000 + i);
      const height = randInt(rng, 160, 190);
      const startingWeight = randInt(rng, 62, 96);
      const goalDir = spec.goal === "Muscle Gain" ? 1 : -1; // gain vs cut
      const targetWeight = startingWeight + goalDir * randInt(rng, 4, 9);
      const macros = nutritionFor(spec.goal, rng);

      const profile = {
        trainerId: trainer._id,
        name: spec.name,
        gender: spec.gender,
        age: randInt(rng, 24, 45),
        city: pick(rng, ["London", "Manchester", "Bristol", "Leeds", "Glasgow"]),
        height,
        startingWeight,
        bodyFat: randInt(rng, 12, 28),
        goal: spec.goal,
        targetWeight,
        timeline: "12 weeks",
        startDate: daysAgo(30),
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fats: macros.fats,
        mealsPerDay: macros.mealsPerDay,
        waterTarget: macros.waterTarget,
        diet: macros.dietType,
        status: "ACTIVE",
        isDemoAccount: true,
      };

      let client;
      if (spec.primary) {
        // The linked, protected demo client — owns the demo client login.
        client = await Client.findOneAndUpdate(
          { trainerId: trainer._id, isDemoAccount: true, name: spec.name },
          {
            $set: {
              ...profile,
              userId: clientUser._id,
              email: clientUser.email,
              invitedEmail: clientUser.email,
              googleLinked: false,
              linkedAt: daysAgo(29),
              isProtected: true,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } else {
        client = await Client.findOneAndUpdate(
          { trainerId: trainer._id, isDemoAccount: true, name: spec.name },
          { $set: { ...profile, isProtected: false } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
      clients.push({ doc: client, spec, macros });
    }
    console.log(`[seed] Upserted ${clients.length} demo client profiles.`);

    // 3) Wipe demo-owned dependent data, scoped to demo clients only ─────────
    const clientIds = clients.map((c) => c.doc._id);
    await Promise.all([
      WorkoutCompletion.deleteMany({ clientId: { $in: clientIds } }),
      WorkoutPlan.deleteMany({ clientId: { $in: clientIds } }),
      NutritionPlan.deleteMany({ clientId: { $in: clientIds } }),
      CheckIn.deleteMany({ clientId: { $in: clientIds } }),
      ActivityLog.deleteMany({ trainerId: trainer._id }),
    ]);

    // 4) Rebuild dependent data ──────────────────────────────────────────────
    const workoutPlanDocs = [];
    const nutritionPlanDocs = [];
    const checkinDocs = [];
    const completionDocs = [];
    const activityDocs = [];

    for (let i = 0; i < clients.length; i++) {
      const { doc: client, spec, macros } = clients[i];
      const rng = makeRng(5000 + i);
      const clientId = client._id;
      const ts = (date) => ({ createdAt: date, updatedAt: date });

      // ── Workout plans: 1 ACTIVE + 1 ARCHIVED ──
      const activePlanId = new mongoose.Types.ObjectId();
      const exercises = buildExercises(rng);
      workoutPlanDocs.push({
        _id: activePlanId,
        clientId,
        planName: `${spec.goal} — Phase 1`,
        goal: spec.goal,
        durationWeeks: 12,
        notes: "Progressive overload. Log every set.",
        status: "ACTIVE",
        exercises,
        ...ts(daysAgo(28)),
      });
      workoutPlanDocs.push({
        _id: new mongoose.Types.ObjectId(),
        clientId,
        planName: `${spec.goal} — Intro Block`,
        goal: spec.goal,
        durationWeeks: 4,
        notes: "Onboarding block (completed).",
        status: "ARCHIVED",
        exercises: buildExercises(rng).slice(0, 8),
        ...ts(daysAgo(60)),
      });

      // ── Nutrition plans: 1 ACTIVE + 1 ARCHIVED ──
      nutritionPlanDocs.push({
        _id: new mongoose.Types.ObjectId(),
        clientId,
        planName: `${macros.dietType} ${macros.calories} kcal`,
        notes: "Hit protein daily; water target is a floor not a ceiling.",
        status: "ACTIVE",
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fats: macros.fats,
        waterTarget: macros.waterTarget,
        mealsPerDay: macros.mealsPerDay,
        cheatMeals: macros.cheatMeals,
        dietType: macros.dietType,
        ...ts(daysAgo(28)),
      });
      nutritionPlanDocs.push({
        _id: new mongoose.Types.ObjectId(),
        clientId,
        planName: "Onboarding Macros",
        notes: "Initial baseline (superseded).",
        status: "ARCHIVED",
        calories: macros.calories + 150,
        protein: macros.protein - 10,
        carbs: macros.carbs + 20,
        fats: macros.fats,
        waterTarget: macros.waterTarget,
        mealsPerDay: macros.mealsPerDay,
        cheatMeals: macros.cheatMeals,
        dietType: macros.dietType,
        ...ts(daysAgo(60)),
      });

      // ── Lifecycle activity (newest-relevant for a mature feed) ──
      activityDocs.push(
        { trainerId: trainer._id, clientId, actorId: trainer._id, actorRole: "TRAINER", type: "CLIENT_CREATED",     entityId: clientId,     summary: `Added ${spec.name} as a client`,                          metadata: { demo: true }, ...ts(daysAgo(30)) },
        { trainerId: trainer._id, clientId, actorId: trainer._id, actorRole: "TRAINER", type: "INVITE_SENT",        entityId: clientId,     summary: `Activation link generated for ${spec.name}`,              metadata: { demo: true }, ...ts(daysAgo(30, 60_000)) },
        { trainerId: trainer._id, clientId, actorId: client.userId || trainer._id, actorRole: "CLIENT", type: "INVITE_ACTIVATED", entityId: clientId, summary: `${spec.name} activated their account`,        metadata: { demo: true }, ...ts(daysAgo(29)) },
        { trainerId: trainer._id, clientId, actorId: trainer._id, actorRole: "TRAINER", type: "WORKOUT_PUBLISHED",   entityId: activePlanId, summary: `Workout plan "${spec.goal} — Phase 1" published for ${spec.name}`, metadata: { demo: true }, ...ts(daysAgo(28)) },
        { trainerId: trainer._id, clientId, actorId: trainer._id, actorRole: "TRAINER", type: "NUTRITION_PUBLISHED", entityId: clientId,     summary: `Nutrition plan "${macros.dietType} ${macros.calories} kcal" published for ${spec.name}`, metadata: { demo: true }, ...ts(daysAgo(28)) },
      );

      // ── Check-ins across ~30 days ──
      // Cadence ~ every 3-4 days. "Attention" clients stop ~10 days ago so
      // their latest check-in is stale (>7d) for the dashboard panel.
      const lastDay = spec.attention ? 10 : randInt(rng, 1, 3);
      const cadence = randInt(rng, 3, 4);
      const checkinDates = [];
      for (let d = 30; d >= lastDay; d -= cadence) checkinDates.push(d);

      const totalSteps = Math.max(checkinDates.length - 1, 1);
      checkinDates.forEach((d, idx) => {
        // Weight trends from starting → target across the series.
        const progress = idx / totalSteps;
        const weight = round1(
          client.startingWeight + (client.targetWeight - client.startingWeight) * progress * 0.6 + (rng() - 0.5)
        );
        const date = daysAgo(d, randInt(rng, 0, 6) * 3_600_000);
        // Only the single latest check-in stays PENDING (the trainer's review
        // queue); everything older is REVIEWED with a coach comment. Attention
        // clients have no fresh check-in, so theirs are all REVIEWED — they
        // surface via the dashboard's 7-day-stale rule instead.
        const isLatest = idx === checkinDates.length - 1;
        const status = isLatest && !spec.attention ? "PENDING" : "REVIEWED";
        checkinDocs.push({
          clientId,
          trainerId: trainer._id,
          weight,
          sleep: round1(6 + rng() * 2.5),
          water: round1(2 + rng() * 1.5),
          energy: randInt(rng, 3, 5),
          mood: randInt(rng, 3, 5),
          notes: pick(rng, ["Felt strong this week.", "Sleep was a bit short.", "Cravings under control.", "Energy dipped mid-week.", "Great session today."]),
          status,
          ...(status === "REVIEWED" ? { trainerComment: "Nice work — keep it consistent.", reviewedAt: new Date(date.getTime() + DAY_MS) } : {}),
          ...ts(date),
        });
        activityDocs.push({
          trainerId: trainer._id,
          clientId,
          actorId: client.userId || trainer._id,
          actorRole: "CLIENT",
          type: "CHECKIN_SUBMITTED",
          summary: `${spec.name} submitted a check-in — ${weight} kg`,
          metadata: { demo: true },
          ...ts(date),
        });
      });

      // ── Workout completions (historical adherence) ──
      // Complete ~60% of the active plan's exercises, dated across the month.
      const toComplete = exercises.filter(() => rng() < 0.6);
      toComplete.forEach((ex) => {
        const d = randInt(rng, lastDay, 27);
        const date = daysAgo(d, randInt(rng, 0, 12) * 3_600_000);
        completionDocs.push({
          clientId,
          workoutPlanId: activePlanId,
          exerciseId: ex._id,
          completedAt: date,
          ...ts(date),
        });
      });
      // A couple of EXERCISE_COMPLETED + a WORKOUT_COMPLETED for the feed.
      toComplete.slice(0, 3).forEach((ex) => {
        const date = daysAgo(randInt(rng, lastDay, 20));
        activityDocs.push({
          trainerId: trainer._id, clientId, actorId: client.userId || trainer._id, actorRole: "CLIENT",
          type: "EXERCISE_COMPLETED", entityId: activePlanId,
          summary: `${spec.name} completed ${ex.name}`, metadata: { demo: true }, ...ts(date),
        });
      });
      if (toComplete.length >= 4) {
        const date = daysAgo(randInt(rng, lastDay, 18));
        activityDocs.push({
          trainerId: trainer._id, clientId, actorId: client.userId || trainer._id, actorRole: "CLIENT",
          type: "WORKOUT_COMPLETED", entityId: activePlanId,
          summary: `${spec.name} completed the "${spec.goal} — Phase 1" workout`, metadata: { demo: true }, ...ts(date),
        });
      }
    }

    // 5) Bulk insert (timestamps:false so our backdated createdAt/updatedAt stick)
    const opts = { timestamps: false };
    await WorkoutPlan.insertMany(workoutPlanDocs, opts);
    await NutritionPlan.insertMany(nutritionPlanDocs, opts);
    await CheckIn.insertMany(checkinDocs, opts);
    await WorkoutCompletion.insertMany(completionDocs, opts);
    await ActivityLog.insertMany(activityDocs, opts);

    console.log(
      `[seed] ✅ Done. ${clients.length} clients · ${workoutPlanDocs.length} workout plans · ` +
      `${nutritionPlanDocs.length} nutrition plans · ${checkinDocs.length} check-ins · ` +
      `${completionDocs.length} completions · ${activityDocs.length} activity events.`
    );
    console.log("[seed] Demo trainer login: demo.trainer@fitos.com / demo.trainer.fitos@143");
    console.log("[seed] Demo client  login: demo.client@fitos.com / demo.client.fitos@143");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("[seed] Failed:", err.message);
  process.exit(1);
});
