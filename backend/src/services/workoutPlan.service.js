"use strict";

const { WorkoutPlan } = require("../schemas/WorkoutPlan.schema");
const { Client } = require("../schemas/Client.schema");
const { WorkoutCompletion } = require("../schemas/WorkoutCompletion.schema");
const { ActivityLog } = require("../schemas/ActivityLog.schema");
const { validateWorkoutPayload } = require("../validators/workoutPayload.validator");
const ApiError = require("../utils/ApiError");
const activityService = require("./activity.service");
const access = require("../utils/clientAccess");
const { exerciseSummary, setDetailsPublishErrors, cloneSetDetails } = require("../utils/workoutSets");

const { assertObjectId, assertTrainer } = access;

/**
 * Decorate a plan for API responses with a COMPUTED per-exercise summary
 * ({ setCount, weight: {min,max,varies,display} | null }) so the client can
 * render a clean line without re-deriving from setDetails. Accepts a Mongoose
 * doc or a lean object; always returns a plain object. Flat (legacy) exercises
 * get a summary derived from their flat sets/weight fields.
 */
function decoratePlan(plan) {
  if (!plan) return plan;
  const obj = typeof plan.toObject === "function" ? plan.toObject() : plan;
  const exercises = (obj.exercises || []).map((ex) => ({ ...ex, summary: exerciseSummary(ex) }));
  return { ...obj, exercises };
}

// Workout plans filter out soft-deleted clients on every access path, so the
// shared helpers are wrapped here to force `excludeDeleted: true`. This keeps
// every existing call site below byte-for-byte identical in behaviour.
const resolveClientForUser = (user, clientId, opts = {}) =>
  access.resolveClientForUser(user, clientId, { ...opts, excludeDeleted: true });
const resolveCurrentClient = (user) =>
  access.resolveCurrentClient(user, { excludeDeleted: true });

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
  const plan = await WorkoutPlan.create({
    clientId: client._id,
    ...result.value
  });
  return decoratePlan(plan);
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

  const plans = await WorkoutPlan.find(query).sort({ createdAt: -1 }).lean();
  return plans.map(decoratePlan);
}

async function getWorkoutPlansForCurrentClient(user) {
  const client = await resolveCurrentClient(user);
  const plans = await WorkoutPlan.find({ clientId: client._id, status: "ACTIVE" })
    .sort({ createdAt: -1 })
    .lean();
  return plans.map(decoratePlan);
}

async function getWorkoutPlanById(user, workoutPlanId) {
  return decoratePlan(await getWorkoutPlanWithAccess(user, workoutPlanId));
}

async function updateWorkoutPlan(user, workoutPlanId, body) {
  const result = validateWorkoutPayload(body, { partial: true });
  if (!result.ok) {
    throw ApiError.validation(result.errors);
  }

  const workoutPlan = await getWorkoutPlanWithAccess(user, workoutPlanId, { write: true });
  Object.assign(workoutPlan, result.value);
  await workoutPlan.save();
  return decoratePlan(workoutPlan);
}

async function archiveWorkoutPlan(user, workoutPlanId) {
  const workoutPlan = await getWorkoutPlanWithAccess(user, workoutPlanId, { write: true });
  workoutPlan.status = "ARCHIVED";
  await workoutPlan.save();
  return decoratePlan(workoutPlan);
}

async function publishWorkoutPlan(user, workoutPlanId) {
  const workoutPlan = await getWorkoutPlanWithAccess(user, workoutPlanId, { write: true });
  if (!workoutPlan.exercises || workoutPlan.exercises.length === 0) {
    throw new ApiError(400, "Cannot publish a plan with no exercises");
  }

  // Set-detailed exercises (v2): every set must have weight >= 0 and reps >= 1.
  // Flat (legacy) exercises are unaffected — they keep the "has >= 1 exercise"
  // rule above (setDetailsPublishErrors returns [] for them).
  const setErrors = [];
  for (const ex of workoutPlan.exercises) {
    const bad = setDetailsPublishErrors(ex);
    if (bad.length > 0) {
      setErrors.push(`${ex.name}: ${bad.map((b) => `set ${b.setNumber} ${b.reason}`).join(", ")}`);
    }
  }
  if (setErrors.length > 0) {
    throw new ApiError(400, `Every set needs a non-negative weight and reps ≥ 1 (${setErrors.join("; ")}).`);
  }

  const wasActive = workoutPlan.status === "ACTIVE";
  workoutPlan.status = "ACTIVE";
  await workoutPlan.save();

  // Record only on the DRAFT/ARCHIVED → ACTIVE edge so flipping an
  // already-published plan doesn't spam the feed.
  if (!wasActive) {
    const client = await Client.findById(workoutPlan.clientId);
    await activityService.record({
      trainerId: client?.trainerId || user._id,
      clientId:  workoutPlan.clientId,
      actorId:   user._id,
      actorRole: user.role,
      type:      "WORKOUT_PUBLISHED",
      entityId:  workoutPlan._id,
      summary:   `Workout plan "${workoutPlan.planName}" published${client?.name ? ` for ${client.name}` : ""}`,
    });
  }

  return decoratePlan(workoutPlan);
}

/**
 * Hard delete — removes the plan document and any completion records that
 * referenced it. Use `archiveWorkoutPlan` instead if the trainer just
 * wants to hide the plan but keep history.
 */
async function deleteWorkoutPlan(user, workoutPlanId) {
  const workoutPlan = await getWorkoutPlanWithAccess(user, workoutPlanId, { write: true });
  await WorkoutCompletion.deleteMany({ workoutPlanId: workoutPlan._id });
  await WorkoutPlan.deleteOne({ _id: workoutPlan._id });
  return { _id: workoutPlan._id, deleted: true };
}

/**
 * Reassign — clones the plan's structure onto a different client owned by
 * the same trainer. The new plan starts as DRAFT so the trainer can review
 * before publishing; completions are NOT copied (those are per-client).
 */
async function reassignWorkoutPlan(user, workoutPlanId, targetClientId) {
  const sourcePlan = await getWorkoutPlanWithAccess(user, workoutPlanId, { write: true });
  if (String(sourcePlan.clientId) === String(targetClientId)) {
    throw new ApiError(400, "Target client must be different from the current owner");
  }
  const targetClient = await resolveClientForUser(user, targetClientId);

  const cloneExercises = (sourcePlan.exercises || []).map((ex) => ({
    name: ex.name,
    sets: ex.sets,
    reps: ex.reps,
    weight: ex.weight,
    restSeconds: ex.restSeconds,
    dayNumber: ex.dayNumber,
    order: ex.order,
    notes: ex.notes,
    setDetails: cloneSetDetails(ex), // snapshot per-set rows by value (no shared _ids)
  }));

  const created = await WorkoutPlan.create({
    clientId: targetClient._id,
    planName: sourcePlan.planName,
    goal: sourcePlan.goal,
    durationWeeks: sourcePlan.durationWeeks,
    notes: sourcePlan.notes,
    status: "DRAFT",
    exercises: cloneExercises,
  });
  return decoratePlan(created);
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

  const completion = await WorkoutCompletion.create({
    clientId: workoutPlan.clientId,
    workoutPlanId: workoutPlan._id,
    exerciseId: exercise._id
  });

  // Activity: one EXERCISE_COMPLETED per exercise, plus a single
  // WORKOUT_COMPLETED when the final exercise of the plan is checked off.
  const client = await Client.findById(workoutPlan.clientId);
  const trainerId = client?.trainerId;
  if (trainerId) {
    await activityService.record({
      trainerId,
      clientId:  workoutPlan.clientId,
      actorId:   user._id,
      actorRole: "CLIENT",
      type:      "EXERCISE_COMPLETED",
      entityId:  workoutPlan._id,
      summary:   `${client?.name || "Client"} completed ${exercise.name}`,
      metadata:  { planName: workoutPlan.planName, exerciseName: exercise.name },
    });

    const totalExercises = workoutPlan.exercises.length;
    const completedCount = await WorkoutCompletion.countDocuments({
      clientId: workoutPlan.clientId,
      workoutPlanId: workoutPlan._id,
    });
    if (totalExercises > 0 && completedCount >= totalExercises) {
      await activityService.record({
        trainerId,
        clientId:  workoutPlan.clientId,
        actorId:   user._id,
        actorRole: "CLIENT",
        type:      "WORKOUT_COMPLETED",
        entityId:  workoutPlan._id,
        summary:   `${client?.name || "Client"} completed the "${workoutPlan.planName}" workout`,
        metadata:  { planName: workoutPlan.planName, totalExercises },
      });
    }
  }

  return completion;
}

/**
 * Record that the client viewed today's workout. Deduped to at most one
 * TODAYS_WORKOUT_VIEWED per client per calendar day so a dashboard that
 * reloads frequently doesn't flood the feed. No-op when the client has no
 * active plan or trainer.
 */
async function logTodaysWorkoutViewed(user) {
  const client = await resolveCurrentClient(user);
  if (!client.trainerId) return { logged: false };

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const alreadyToday = await ActivityLog.findOne({
    trainerId: client.trainerId,
    clientId:  client._id,
    type:      "TODAYS_WORKOUT_VIEWED",
    createdAt: { $gte: startOfDay },
  }).select("_id");

  if (alreadyToday) return { logged: false };

  await activityService.record({
    trainerId: client.trainerId,
    clientId:  client._id,
    actorId:   user._id,
    actorRole: "CLIENT",
    type:      "TODAYS_WORKOUT_VIEWED",
    entityId:  client._id,
    summary:   `${client.name} viewed today's workout`,
  });

  return { logged: true };
}

module.exports = {
  createWorkoutPlan,
  getWorkoutPlansForClient,
  getWorkoutPlansForCurrentClient,
  getWorkoutPlanById,
  updateWorkoutPlan,
  publishWorkoutPlan,
  archiveWorkoutPlan,
  deleteWorkoutPlan,
  reassignWorkoutPlan,
  getWorkoutCompletionHistory,
  completeExercise,
  logTodaysWorkoutViewed
};
