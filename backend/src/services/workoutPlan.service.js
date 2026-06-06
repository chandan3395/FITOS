"use strict";

const mongoose = require("mongoose");
const { WorkoutPlan } = require("../schemas/WorkoutPlan.schema");
const { Client } = require("../schemas/Client.schema");
const { WorkoutCompletion } = require("../schemas/WorkoutCompletion.schema");
const { validateWorkoutPayload } = require("../validators/workoutPayload.validator");
const ApiError = require("../utils/ApiError");

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
  if (!client) {
    throw new ApiError(404, "Client not found");
  }

  if (user.role === "TRAINER") {
    if (String(client.trainerId) !== String(user._id)) {
      throw new ApiError(403, "Forbidden");
    }
    return client;
  }

  if (allowAdmin && user.role === "ADMIN") {
    return client;
  }

  if (allowClient && user.role === "CLIENT" && String(client.userId) === String(user._id)) {
    return client;
  }

  throw new ApiError(403, "Forbidden");
}

async function resolveCurrentClient(user) {
  if (user.role !== "CLIENT") {
    throw new ApiError(403, "Forbidden");
  }

  const client = await Client.findOne({ userId: user._id });
  if (!client) {
    throw new ApiError(404, "Client record not found");
  }

  return client;
}

async function getWorkoutPlanWithAccess(user, workoutPlanId, { write = false } = {}) {
  assertObjectId(workoutPlanId, "workoutPlanId");

  const workoutPlan = await WorkoutPlan.findById(workoutPlanId);
  if (!workoutPlan) {
    throw new ApiError(404, "Workout plan not found");
  }

  await resolveClientForUser(user, workoutPlan.clientId, {
    allowAdmin: !write,
    allowClient: !write
  });

  if (write) {
    assertTrainer(user);
  }

  return workoutPlan;
}

async function createWorkoutPlan(user, clientId, body) {
  assertTrainer(user);

  const result = validateWorkoutPayload(body);
  if (!result.ok) {
    throw ApiError.validation(result.errors);
  }

  const client = await resolveClientForUser(user, clientId);
  return WorkoutPlan.create({
    clientId: client._id,
    ...result.value
  });
}

async function getWorkoutPlansForClient(user, clientId, filters = {}) {
  const client = await resolveClientForUser(user, clientId, {
    allowAdmin: true,
    allowClient: true
  });

  const query = { clientId: client._id };
  if (filters.status) {
    query.status = String(filters.status).trim().toUpperCase();
  }

  return WorkoutPlan.find(query).sort({ createdAt: -1 }).lean();
}

async function getWorkoutPlansForCurrentClient(user) {
  const client = await resolveCurrentClient(user);
  return WorkoutPlan.find({ clientId: client._id, status: "ACTIVE" })
    .sort({ createdAt: -1 })
    .lean();
}

async function getWorkoutPlanById(user, workoutPlanId) {
  return getWorkoutPlanWithAccess(user, workoutPlanId);
}

async function updateWorkoutPlan(user, workoutPlanId, body) {
  const result = validateWorkoutPayload(body, { partial: true });
  if (!result.ok) {
    throw ApiError.validation(result.errors);
  }

  const workoutPlan = await getWorkoutPlanWithAccess(user, workoutPlanId, { write: true });
  Object.assign(workoutPlan, result.value);
  await workoutPlan.save();
  return workoutPlan;
}

async function deleteWorkoutPlan(user, workoutPlanId) {
  const workoutPlan = await getWorkoutPlanWithAccess(user, workoutPlanId, { write: true });
  workoutPlan.status = "ARCHIVED";
  await workoutPlan.save();
  return workoutPlan;
}

async function getWorkoutCompletionHistory(user, workoutPlanId) {
  const workoutPlan = await getWorkoutPlanWithAccess(user, workoutPlanId);

  return WorkoutCompletion.find({
    clientId: workoutPlan.clientId,
    workoutPlanId: workoutPlan._id
  })
    .sort({ completedAt: -1 })
    .lean();
}

async function completeExercise(user, workoutPlanId, exerciseId) {
  const workoutPlan = await getWorkoutPlanWithAccess(user, workoutPlanId);
  if (user.role !== "CLIENT") {
    throw new ApiError(403, "Forbidden");
  }

  if (workoutPlan.status !== "ACTIVE") {
    throw new ApiError(403, "Cannot complete an archived workout plan");
  }

  assertObjectId(exerciseId, "exerciseId");

  const exercise = workoutPlan.exercises.id(exerciseId);
  if (!exercise) {
    throw new ApiError(404, "Exercise not found");
  }

  const existing = await WorkoutCompletion.findOne({
    clientId: workoutPlan.clientId,
    workoutPlanId: workoutPlan._id,
    exerciseId: exercise._id
  });

  if (existing) {
    return existing;
  }

  return WorkoutCompletion.create({
    clientId: workoutPlan.clientId,
    workoutPlanId: workoutPlan._id,
    exerciseId: exercise._id
  });
}

module.exports = {
  createWorkoutPlan,
  getWorkoutPlansForClient,
  getWorkoutPlansForCurrentClient,
  getWorkoutPlanById,
  updateWorkoutPlan,
  deleteWorkoutPlan,
  getWorkoutCompletionHistory,
  completeExercise
};
