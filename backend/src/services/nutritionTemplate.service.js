"use strict";

const mongoose = require("mongoose");
const { NutritionTemplate } = require("../schemas/NutritionTemplate.schema");
const { NutritionPlan } = require("../schemas/NutritionPlan.schema");
const { Client } = require("../schemas/Client.schema");
const { validateNutritionTemplatePayload } = require("../validators/nutritionTemplatePayload.validator");
const ApiError = require("../utils/ApiError");

const PERSISTED = [
  "name", "description", "notes", "status",
  "calories", "protein", "carbs", "fats",
  "waterTarget", "mealsPerDay", "cheatMeals",
  "dietType", "foodRestrictions", "eatingHabits",
  "schedule",
];

function assertObjectId(id, label) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, `Invalid ${label}`);
}

function assertTrainer(user) {
  if (user.role !== "TRAINER") throw new ApiError(403, "Forbidden");
}

async function loadOwned(user, templateId) {
  assertObjectId(templateId, "templateId");
  const doc = await NutritionTemplate.findById(templateId);
  if (!doc) throw new ApiError(404, "Nutrition template not found");
  if (String(doc.trainerId) !== String(user._id)) throw new ApiError(403, "Forbidden");
  return doc;
}

async function listForUser(user, { status } = {}) {
  assertTrainer(user);
  const q = { trainerId: user._id };
  if (status) q.status = String(status).trim().toUpperCase();
  return NutritionTemplate.find(q).sort({ updatedAt: -1 }).lean();
}

async function getById(user, templateId) {
  assertTrainer(user);
  return loadOwned(user, templateId);
}

async function create(user, body) {
  assertTrainer(user);
  const result = validateNutritionTemplatePayload(body);
  if (!result.ok) throw ApiError.validation(result.errors);
  const data = { trainerId: user._id };
  for (const k of PERSISTED) if (result.value[k] !== undefined) data[k] = result.value[k];
  return NutritionTemplate.create(data);
}

async function update(user, templateId, body) {
  assertTrainer(user);
  const result = validateNutritionTemplatePayload(body, { partial: true });
  if (!result.ok) throw ApiError.validation(result.errors);
  const doc = await loadOwned(user, templateId);
  for (const k of PERSISTED) if (result.value[k] !== undefined) doc[k] = result.value[k];
  await doc.save();
  return doc;
}

async function archive(user, templateId) {
  assertTrainer(user);
  const doc = await loadOwned(user, templateId);
  doc.status = "ARCHIVED";
  await doc.save();
  return doc;
}

async function remove(user, templateId) {
  assertTrainer(user);
  const doc = await loadOwned(user, templateId);
  await NutritionTemplate.deleteOne({ _id: doc._id });
  return { _id: doc._id, deleted: true };
}

async function duplicate(user, templateId) {
  assertTrainer(user);
  const source = await loadOwned(user, templateId);
  const data = { trainerId: user._id, name: `${source.name} (copy)`, status: "ACTIVE" };
  for (const k of PERSISTED) {
    if (k === "status" || k === "name") continue;
    if (source[k] !== undefined && source[k] !== null) data[k] = source[k];
  }
  return NutritionTemplate.create(data);
}

/**
 * Snapshot the template into a brand-new NutritionPlan owned by the
 * target client. Macros, prefs, and notes are copied by value — no
 * reference back to the template — so future template edits cannot
 * leak. New plan starts in DRAFT.
 *
 * Field-name reconciliation:
 *   - template.foodRestrictions ──▶ plan.foodAvoidances
 *     (templates use the trainer-facing wording per the spec; plans
 *     use the client-facing wording from onboarding.)
 */
async function assignToClient(user, templateId, clientId) {
  assertTrainer(user);
  if (!mongoose.isValidObjectId(clientId)) throw new ApiError(400, "Invalid clientId");

  const template = await loadOwned(user, templateId);

  const client = await Client.findById(clientId);
  if (!client) throw new ApiError(404, "Client not found");
  if (String(client.trainerId) !== String(user._id)) {
    throw new ApiError(403, "Forbidden");
  }

  const combinedNotes = [template.description, template.notes]
    .filter(Boolean)
    .join("\n\n") || undefined;

  // Snapshot the weekly schedule BY VALUE so future template edits can never
  // mutate this assigned plan (the template→snapshot rule).
  const schedule = template.toObject().schedule || [];

  return NutritionPlan.create({
    clientId:    client._id,
    planName:    template.name,
    notes:       combinedNotes,
    status:      "DRAFT",

    calories:    template.calories,
    protein:     template.protein,
    carbs:       template.carbs,
    fats:        template.fats,
    waterTarget: template.waterTarget,
    mealsPerDay: template.mealsPerDay,
    cheatMeals:  template.cheatMeals,

    dietType:       template.dietType,
    foodAvoidances: template.foodRestrictions,
    eatingHabits:   template.eatingHabits,

    schedule,
  });
}

module.exports = { listForUser, getById, create, update, archive, remove, duplicate, assignToClient };
