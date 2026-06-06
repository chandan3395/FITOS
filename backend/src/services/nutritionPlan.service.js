"use strict";

const mongoose = require("mongoose");
const { NutritionPlan } = require("../schemas/NutritionPlan.schema");
const { Client } = require("../schemas/Client.schema");
const { validateNutritionPayload } = require("../validators/nutritionPayload.validator");
const ApiError = require("../utils/ApiError");

// Single source of truth for fields the validator may write into a plan.
// Update this list when the schema gains new persisted fields.
const PERSISTED_PLAN_FIELDS = [
  "planName", "notes", "status",
  "calories", "protein", "carbs", "fats",
  "waterTarget", "mealsPerDay", "cheatMeals",
  "dietType", "foodAvoidances", "eatingHabits",
];

function assertObjectId(id, label) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
}

function assertTrainer(user) {
  if (user.role !== "TRAINER") {
    throw new ApiError(403, "Forbidden");
  }
}

async function resolveClientForUser(user, clientId, { allowAdmin = false, allowClient = false } = {}) {
  assertObjectId(clientId, "clientId");
  const client = await Client.findById(clientId);
  if (!client) throw new ApiError(404, "Client not found");

  if (user.role === "TRAINER") {
    if (String(client.trainerId) !== String(user._id)) throw new ApiError(403, "Forbidden");
    return client;
  }
  if (allowAdmin && user.role === "ADMIN") return client;
  if (allowClient && user.role === "CLIENT" && String(client.userId) === String(user._id)) return client;
  throw new ApiError(403, "Forbidden");
}

async function resolveCurrentClient(user) {
  if (user.role !== "CLIENT") throw new ApiError(403, "Forbidden");
  const client = await Client.findOne({ userId: user._id });
  if (!client) throw new ApiError(404, "Client record not found");
  return client;
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
  return NutritionPlan.create(data);
}

async function listNutritionPlansForClient(user, clientId, filters = {}) {
  const client = await resolveClientForUser(user, clientId, {
    allowAdmin: true, allowClient: true
  });
  const query = { clientId: client._id };
  if (filters.status) query.status = String(filters.status).trim().toUpperCase();
  return NutritionPlan.find(query).sort({ createdAt: -1 }).lean();
}

async function listNutritionPlansForCurrentClient(user) {
  const client = await resolveCurrentClient(user);
  return NutritionPlan.find({ clientId: client._id, status: "ACTIVE" })
    .sort({ createdAt: -1 })
    .lean();
}

async function getNutritionPlanById(user, planId) {
  return getPlanWithAccess(user, planId);
}

async function updateNutritionPlan(user, planId, body) {
  const result = validateNutritionPayload(body, { partial: true });
  if (!result.ok) throw ApiError.validation(result.errors);

  const plan = await getPlanWithAccess(user, planId, { write: true });
  applyValidatedFields(plan, result.value);
  await plan.save();
  return plan;
}

async function publishNutritionPlan(user, planId) {
  const plan = await getPlanWithAccess(user, planId, { write: true });
  // A nutrition plan must at least specify daily calories to be publishable.
  if (plan.calories == null) {
    throw new ApiError(400, "Cannot publish without a daily calorie target");
  }
  plan.status = "ACTIVE";
  await plan.save();
  return plan;
}

async function archiveNutritionPlan(user, planId) {
  const plan = await getPlanWithAccess(user, planId, { write: true });
  plan.status = "ARCHIVED";
  await plan.save();
  return plan;
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

  const data = { clientId: targetClient._id, status: "DRAFT" };
  for (const key of PERSISTED_PLAN_FIELDS) {
    if (key === "status") continue;
    if (source[key] !== undefined && source[key] !== null) data[key] = source[key];
  }
  return NutritionPlan.create(data);
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
