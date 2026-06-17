"use strict";

const mongoose = require("mongoose");
const { MealLog, MEALLOG_STATUSES } = require("../schemas/MealLog.schema");
const { NutritionPlan } = require("../schemas/NutritionPlan.schema");
const { MEAL_TYPES } = require("../schemas/nutritionSchedule.subschema");
const ApiError = require("../utils/ApiError");
const cloudinary = require("../config/cloudinary");
const activityService = require("./activity.service");
const { assertClientAccess, resolveCurrentClient } = require("../utils/clientAccess");
const { dayTotals, consumedFromEntries, weekdayOf } = require("../utils/nutritionTotals");

const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAY_SET = new Set(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);

// ── small pure-ish helpers ───────────────────────────────────────────────
/** Normalize a YYYY-MM-DD string (or now) to a Date at UTC midnight. */
function normalizeDay(input) {
  if (input === undefined || input === null || input === "") {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  const s = String(input);
  if (!DATE_RX.test(s)) throw new ApiError(400, "date must be YYYY-MM-DD");
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, "date is not a valid calendar date");
  return d;
}

const toDateString = (date) => date.toISOString().slice(0, 10);

function canonicalMealType(raw) {
  const lower = String(raw || "").trim().toLowerCase();
  const match = MEAL_TYPES.find((m) => m.toLowerCase() === lower);
  if (!match) throw new ApiError(400, `mealType must be one of: ${MEAL_TYPES.join(", ")}`);
  return match;
}

/** Build the embedded photo from a Cloudinary publicId (backend stays authoritative). */
function buildPhoto(body) {
  const publicId = typeof body.photo === "object" && body.photo ? body.photo.publicId : body.publicId;
  if (!publicId || typeof publicId !== "string") {
    throw new ApiError(400, "A Cloudinary publicId is required for the meal photo");
  }
  return {
    publicId,
    url: cloudinary.urlFor(publicId),
    thumbnailUrl: cloudinary.thumbnailUrlFor(publicId),
  };
}

/** Most recent ACTIVE nutrition plan for a client (the snapshot source). */
function findActivePlan(clientId) {
  return NutritionPlan.findOne({ clientId, status: "ACTIVE" }).sort({ createdAt: -1 });
}

/**
 * Snapshot the planned macros + dishes for a (weekday, mealType) from a plan.
 * Returns zeros + [] when there is no plan / no matching meal so logging an
 * unplanned meal still works.
 */
function snapshotForMeal(plan, weekday, mealType) {
  const empty = { plannedMacros: { calories: 0, protein: 0, carbs: 0, fats: 0 }, dishesSnapshot: [] };
  if (!plan || !Array.isArray(plan.schedule)) return empty;
  const day = plan.schedule.find((d) => d.day === weekday);
  if (!day) return empty;
  const meal = (day.meals || []).find((m) => m.mealType === mealType);
  if (!meal) return empty;
  return {
    plannedMacros: {
      calories: meal.calories || 0,
      protein: meal.protein || 0,
      carbs: meal.carbs || 0,
      fats: meal.fats || 0,
    },
    dishesSnapshot: Array.isArray(meal.dishes) ? [...meal.dishes] : [],
  };
}

// ── public API ───────────────────────────────────────────────────────────

/**
 * POST /api/meal-logs
 * Client logs/uploads a meal. Bytes were already uploaded to Cloudinary via
 * /api/uploads/sign-meal-log; the body carries the resulting publicId plus
 * mealType (+ optional date). We persist metadata and SNAPSHOT the planned
 * macros for that weekday/mealType from the client's active plan.
 *
 * One MealLog doc per (client, day); re-logging the same mealType replaces
 * that entry and resets it to "pending".
 */
async function create(user, body) {
  const client =
    user.role === "CLIENT" ? await resolveCurrentClient(user) : await assertClientAccess(body.clientId, user);

  const date = normalizeDay(body.date);
  const mealType = canonicalMealType(body.mealType);
  const photo = buildPhoto(body);

  const plan = await findActivePlan(client._id);
  const weekday = weekdayOf(date);
  const { plannedMacros, dishesSnapshot } = snapshotForMeal(plan, weekday, mealType);

  const entry = {
    mealType,
    dishesSnapshot,
    plannedMacros,
    photo,
    status: "pending",
  };

  let log = await MealLog.findOne({ clientId: client._id, date });
  if (log) {
    if (plan?._id) log.planId = plan._id;
    const idx = log.entries.findIndex((e) => e.mealType === mealType);
    if (idx >= 0) log.entries.set(idx, entry); // replace + reset to pending
    else log.entries.push(entry);
    await log.save();
  } else {
    log = await MealLog.create({
      clientId: client._id,
      trainerId: client.trainerId,
      planId: plan?._id,
      date,
      entries: [entry],
    });
  }

  await activityService.record({
    trainerId: client.trainerId,
    clientId: client._id,
    actorId: user._id,
    actorRole: user.role,
    type: "MEAL_LOGGED",
    entityId: log._id,
    summary: `${client.name} logged ${mealType} for ${toDateString(date)}`,
    metadata: { date: toDateString(date), mealType },
  });

  return log;
}

/** GET /api/meal-logs/client/:id — trainer/admin: a client's logs, newest first. */
async function listForClient(clientId, user) {
  await assertClientAccess(clientId, user);
  return MealLog.find({ clientId }).sort({ date: -1 }).lean();
}

/** GET /api/meal-logs/me — the signed-in client's own logs (optional ?date). */
async function listForCurrentClient(user, { date } = {}) {
  const client = await resolveCurrentClient(user);
  const query = { clientId: client._id };
  if (date) query.date = normalizeDay(date);
  return MealLog.find(query).sort({ date: -1 }).lean();
}

/**
 * PATCH /api/meal-logs/:id/entries/:entryId/review
 * Mirrors the check-in review flow: only a TRAINER who owns the client may
 * approve ("reviewed") or flag ("action_required" + note) an entry.
 */
async function review(user, logId, entryId, body) {
  if (!mongoose.isValidObjectId(logId)) throw new ApiError(400, "Invalid meal-log id");
  if (!mongoose.isValidObjectId(entryId)) throw new ApiError(400, "Invalid entry id");

  const log = await MealLog.findById(logId);
  if (!log) throw new ApiError(404, "Meal log not found");
  if (user.role !== "ADMIN" && String(log.trainerId) !== String(user._id)) {
    throw new ApiError(403, "Forbidden");
  }
  if (user.role !== "TRAINER") throw new ApiError(403, "Only trainers may review meals");

  const next = String(body.status || "").trim();
  if (!["reviewed", "action_required"].includes(next)) {
    throw new ApiError(400, "status must be reviewed or action_required");
  }

  const entry = log.entries.id(entryId);
  if (!entry) throw new ApiError(404, "Meal entry not found");

  entry.status = next;
  if (body.note !== undefined) entry.note = body.note;
  entry.reviewedAt = new Date();
  entry.reviewedBy = user._id;
  await log.save();

  await activityService.record({
    trainerId: log.trainerId,
    clientId: log.clientId,
    actorId: user._id,
    actorRole: "TRAINER",
    type: "MEAL_REVIEWED",
    entityId: log._id,
    summary:
      next === "reviewed"
        ? `Approved ${entry.mealType} (${toDateString(log.date)})`
        : `Flagged ${entry.mealType} for action (${toDateString(log.date)})`,
    metadata: { mealType: entry.mealType, status: next },
  });

  return log;
}

/**
 * GET /api/meal-logs/today — the logged-in client's nutrition "today" summary.
 *   { weekday, date, planId, mealsPerDay, waterTarget,
 *     target   (sum of today's plan meals),
 *     consumed (sum of today's REVIEWED entries),
 *     meals: [{ mealType, dishes, plannedMacros, logStatus, photo }] }
 * Bars/ring on the client card fill from `consumed` (reviewed-only).
 */
async function getTodaySummary(user, { date, weekday } = {}) {
  const client = await resolveCurrentClient(user);
  const day = normalizeDay(date);

  let wd = weekday ? String(weekday).trim() : weekdayOf(day);
  if (!WEEKDAY_SET.has(wd)) wd = weekdayOf(day);

  const plan = await findActivePlan(client._id);
  const planDay = plan && Array.isArray(plan.schedule) ? plan.schedule.find((d) => d.day === wd) : null;
  const planMeals = planDay ? planDay.meals || [] : [];

  const log = await MealLog.findOne({ clientId: client._id, date: day });
  const entries = log ? log.entries : [];

  // Match each plan meal to a logged entry of the same mealType, in order, so
  // duplicate meal types (e.g. two Snacks) pair deterministically.
  const usedEntryIds = new Set();
  const meals = planMeals.map((m) => {
    const match = entries.find(
      (e) => e.mealType === m.mealType && !usedEntryIds.has(String(e._id))
    );
    if (match) usedEntryIds.add(String(match._id));
    return {
      mealType: m.mealType,
      dishes: Array.isArray(m.dishes) ? [...m.dishes] : [],
      plannedMacros: {
        calories: m.calories || 0,
        protein: m.protein || 0,
        carbs: m.carbs || 0,
        fats: m.fats || 0,
      },
      logStatus: match ? match.status : null,
      photo: match && match.photo ? match.photo : null,
    };
  });

  return {
    weekday: wd,
    date: toDateString(day),
    planId: plan ? plan._id : null,
    mealsPerDay: plan ? plan.mealsPerDay ?? null : null,
    waterTarget: plan ? plan.waterTarget ?? null : null,
    target: dayTotals(planDay || { meals: [] }),
    consumed: consumedFromEntries(entries),
    meals,
  };
}

module.exports = {
  create,
  listForClient,
  listForCurrentClient,
  review,
  getTodaySummary,
  MEALLOG_STATUSES,
};
