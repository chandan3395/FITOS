"use strict";

const mongoose = require("mongoose");
const { WorkoutTemplate } = require("../schemas/WorkoutTemplate.schema");
const { WorkoutPlan } = require("../schemas/WorkoutPlan.schema");
const { Client } = require("../schemas/Client.schema");
const { validateWorkoutTemplatePayload } = require("../validators/workoutTemplatePayload.validator");
const ApiError = require("../utils/ApiError");

// Whitelist of persisted fields so service writes are explicit.
const PERSISTED = ["name", "description", "durationWeeks", "notes", "status", "exercises"];

function assertObjectId(id, label) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, `Invalid ${label}`);
}

function assertTrainer(user) {
  if (user.role !== "TRAINER") throw new ApiError(403, "Forbidden");
}

async function loadOwned(user, templateId) {
  assertObjectId(templateId, "templateId");
  const doc = await WorkoutTemplate.findById(templateId);
  if (!doc) throw new ApiError(404, "Workout template not found");
  if (String(doc.trainerId) !== String(user._id)) throw new ApiError(403, "Forbidden");
  return doc;
}

async function listForUser(user, { status } = {}) {
  assertTrainer(user);
  const q = { trainerId: user._id };
  if (status) q.status = String(status).trim().toUpperCase();
  return WorkoutTemplate.find(q).sort({ updatedAt: -1 }).lean();
}

async function getById(user, templateId) {
  assertTrainer(user);
  return loadOwned(user, templateId);
}

async function create(user, body) {
  assertTrainer(user);
  const result = validateWorkoutTemplatePayload(body);
  if (!result.ok) throw ApiError.validation(result.errors);
  const data = { trainerId: user._id };
  for (const k of PERSISTED) if (result.value[k] !== undefined) data[k] = result.value[k];
  return WorkoutTemplate.create(data);
}

async function update(user, templateId, body) {
  assertTrainer(user);
  const result = validateWorkoutTemplatePayload(body, { partial: true });
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
  await WorkoutTemplate.deleteOne({ _id: doc._id });
  return { _id: doc._id, deleted: true };
}

/**
 * Duplicate — clones the template back into the trainer's own library.
 * Strips embedded `_id` so Mongo regenerates them; sets a "(copy)" name
 * and forces status to ACTIVE on the new doc.
 */
async function duplicate(user, templateId) {
  assertTrainer(user);
  const source = await loadOwned(user, templateId);
  const cloneExercises = (source.exercises || []).map((ex) => ({
    name: ex.name,
    sets: ex.sets,
    reps: ex.reps,
    weight: ex.weight,
    restSeconds: ex.restSeconds,
    dayNumber: ex.dayNumber,
    order: ex.order,
    notes: ex.notes,
  }));
  return WorkoutTemplate.create({
    trainerId:     user._id,
    name:          `${source.name} (copy)`,
    description:   source.description,
    durationWeeks: source.durationWeeks,
    notes:         source.notes,
    status:        "ACTIVE",
    exercises:     cloneExercises,
  });
}

/**
 * Snapshot the template into a brand-new WorkoutPlan owned by the target
 * client. The plan stores its own copy of every persisted field and every
 * exercise — there is NO foreign-key reference back to the template, so
 * later edits to the template can never reach this plan. The new plan
 * starts in DRAFT so the trainer can fine-tune before publishing.
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

  // Strip embedded subdoc _ids so Mongo regenerates them — the plan owns
  // its own exercise documents, independent of the template's.
  const exercisesSnapshot = (template.exercises || []).map((ex) => ({
    name:        ex.name,
    sets:        ex.sets,
    reps:        ex.reps,
    weight:      ex.weight,
    restSeconds: ex.restSeconds,
    dayNumber:   ex.dayNumber,
    order:       ex.order,
    notes:       ex.notes,
  }));

  // Template has both a description and a notes field; the plan schema
  // only has `notes`. Preserve both by prepending the description into
  // the plan's notes so nothing the trainer wrote is lost in the
  // snapshot.
  const combinedNotes = [template.description, template.notes]
    .filter(Boolean)
    .join("\n\n") || undefined;

  return WorkoutPlan.create({
    clientId:      client._id,
    planName:      template.name,
    goal:          undefined,
    durationWeeks: template.durationWeeks,
    notes:         combinedNotes,
    status:        "DRAFT",
    exercises:     exercisesSnapshot,
  });
}

module.exports = { listForUser, getById, create, update, archive, remove, duplicate, assignToClient };
