"use strict";

const { NutritionPlan } = require("../schemas/NutritionPlan.schema");
const { Client } = require("../schemas/Client.schema");
const { validateNutritionPayload } = require("../validators/nutritionPayload.validator");
const ApiError = require("../utils/ApiError");
const activityService = require("./activity.service");
// Shared client-access helpers. Nutrition plans do NOT filter soft-deleted
// clients, so the shared defaults (excludeDeleted: false) match the prior
// behaviour and call sites are unchanged.
const {
  assertObjectId,
  assertTrainer,
  resolveClientForUser,
  resolveCurrentClient,
} = require("../utils/clientAccess");
const { dayTotals, weeklyTotals, scheduleMealCountErrors } = require("../utils/nutritionTotals");

// Single source of truth for fields the validator may write into a plan.
// Update this list when the schema gains new persisted fields.
const PERSISTED_PLAN_FIELDS = [
  "planName", "notes", "status",
  "calories", "protein", "carbs", "fats",
  "waterTarget", "mealsPerDay", "cheatMeals",
  "dietType", "foodAvoidances", "eatingHabits",
  "schedule",
];

/**
 * Decorate a plan for API responses with COMPUTED per-day totals and a weekly
 * total. Daily targets are never stored — they are the sum of each day's
 * meals. Accepts a Mongoose doc or a lean object; always returns a plain
 * object. Legacy flat plans (empty schedule) get an empty schedule + zero
 * weekly totals and keep their flat macro fields untouched.
 */
function decoratePlan(plan) {
  if (!plan) return plan;
  const obj = typeof plan.toObject === "function" ? plan.toObject() : plan;
  const schedule = (obj.schedule || []).map((d) => ({ ...d, dailyTotals: dayTotals(d) }));
  return { ...obj, schedule, weeklyTotals: weeklyTotals(obj.schedule || []) };
}

async function getPlanWithAccess(user, planId, { write = false } = {}) {
  assertObjectId(planId, "nutritionPlanId");
  const plan = await NutritionPlan.findById(planId);
  if (!plan) throw new ApiError(404, "Nutrition plan not found");

  await resolveClientForUser(user, plan.clientId, {
    allowAdmin: !write,
    allowClient: !write
  });
  if (write) assertTrainer(user);
  return plan;
}

function applyValidatedFields(plan, value) {
  for (const key of PERSISTED_PLAN_FIELDS) {
    if (value[key] !== undefined) plan[key] = value[key];
  }
}

async function createNutritionPlan(user, clientId, body) {
  assertTrainer(user);
  const result = validateNutritionPayload(body);
  if (!result.ok) throw ApiError.validation(result.errors);

  const client = await resolveClientForUser(user, clientId);
  const data = { clientId: client._id };
  for (const key of PERSISTED_PLAN_FIELDS) {
    if (result.value[key] !== undefined) data[key] = result.value[key];
  }
  const plan = await NutritionPlan.create(data);
  return decoratePlan(plan);
}

async function listNutritionPlansForClient(user, clientId, filters = {}) {
  const client = await resolveClientForUser(user, clientId, {
    allowAdmin: true, allowClient: true
  });
  const query = { clientId: client._id };
  if (filters.status) query.status = String(filters.status).trim().toUpperCase();
  const plans = await NutritionPlan.find(query).sort({ createdAt: -1 }).lean();
  return plans.map(decoratePlan);
}

async function listNutritionPlansForCurrentClient(user) {
  const client = await resolveCurrentClient(user);
  const plans = await NutritionPlan.find({ clientId: client._id, status: "ACTIVE" })
    .sort({ createdAt: -1 })
    .lean();
  return plans.map(decoratePlan);
}

async function getNutritionPlanById(user, planId) {
  return decoratePlan(await getPlanWithAccess(user, planId));
}

async function updateNutritionPlan(user, planId, body) {
  const result = validateNutritionPayload(body, { partial: true });
  if (!result.ok) throw ApiError.validation(result.errors);

  const plan = await getPlanWithAccess(user, planId, { write: true });
  applyValidatedFields(plan, result.value);
  await plan.save();
  return decoratePlan(plan);
}

async function publishNutritionPlan(user, planId) {
  const plan = await getPlanWithAccess(user, planId, { write: true });

  // Structured (v2) plans: every POPULATED day must have exactly mealsPerDay
  // meals. Legacy flat plans (no schedule): keep the original calorie rule.
  const hasSchedule = Array.isArray(plan.schedule) && plan.schedule.length > 0;
  if (hasSchedule) {
    if (plan.mealsPerDay == null) {
      throw new ApiError(400, "Set meals per day before publishing a scheduled plan");
    }
    const bad = scheduleMealCountErrors(plan.schedule, plan.mealsPerDay);
    if (bad.length > 0) {
      const detail = bad.map((b) => `${b.day} has ${b.count}`).join(", ");
      throw new ApiError(
        400,
        `Each scheduled day may have at most ${plan.mealsPerDay} meals (${detail}).`
      );
    }
  } else if (plan.calories == null) {
    throw new ApiError(400, "Cannot publish without a daily calorie target");
  }

  const wasActive = plan.status === "ACTIVE";
  plan.status = "ACTIVE";
  await plan.save();

  if (!wasActive) {
    const client = await Client.findById(plan.clientId);
    await activityService.record({
      trainerId: client?.trainerId || user._id,
      clientId:  plan.clientId,
      actorId:   user._id,
      actorRole: user.role,
      type:      "NUTRITION_PUBLISHED",
      entityId:  plan._id,
      summary:   `Nutrition plan "${plan.planName}" published${client?.name ? ` for ${client.name}` : ""}`,
    });
  }

  return decoratePlan(plan);
}

async function archiveNutritionPlan(user, planId) {
  const plan = await getPlanWithAccess(user, planId, { write: true });
  plan.status = "ARCHIVED";
  await plan.save();
  return decoratePlan(plan);
}

async function deleteNutritionPlan(user, planId) {
  const plan = await getPlanWithAccess(user, planId, { write: true });
  await NutritionPlan.deleteOne({ _id: plan._id });
  return { _id: plan._id, deleted: true };
}

/**
 * Reassign — clones the plan onto a different client owned by the same
 * trainer. The new plan starts as DRAFT so the trainer can review macros
 * before publishing.
 */
async function reassignNutritionPlan(user, planId, targetClientId) {
  const source = await getPlanWithAccess(user, planId, { write: true });
  if (String(source.clientId) === String(targetClientId)) {
    throw new ApiError(400, "Target client must be different from the current owner");
  }
  const targetClient = await resolveClientForUser(user, targetClientId);

  // Snapshot by value (plain object) so the clone shares no subdocument refs
  // with the source plan — editing one never mutates the other.
  const src = source.toObject();
  const data = { clientId: targetClient._id, status: "DRAFT" };
  for (const key of PERSISTED_PLAN_FIELDS) {
    if (key === "status") continue;
    if (src[key] !== undefined && src[key] !== null) data[key] = src[key];
  }
  const created = await NutritionPlan.create(data);
  return decoratePlan(created);
}

module.exports = {
  createNutritionPlan,
  listNutritionPlansForClient,
  listNutritionPlansForCurrentClient,
  getNutritionPlanById,
  updateNutritionPlan,
  publishNutritionPlan,
  archiveNutritionPlan,
  deleteNutritionPlan,
  reassignNutritionPlan,
  PERSISTED_PLAN_FIELDS,
};
