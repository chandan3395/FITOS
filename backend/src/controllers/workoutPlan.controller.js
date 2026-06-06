"use strict";

const {
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
  completeExercise
} = require("../services/workoutPlan.service");
const ApiResponse = require("../utils/ApiResponse");

async function createWorkoutPlanHandler(req, res, next) {
  try {
    const workoutPlan = await createWorkoutPlan(req.user, req.params.clientId, req.body);
    return ApiResponse.created(res, "Workout plan created", { workoutPlan });
  } catch (err) {
    return next(err);
  }
}

async function getWorkoutPlansHandler(req, res, next) {
  try {
    const workoutPlans = await getWorkoutPlansForClient(req.user, req.params.clientId, req.query);
    return ApiResponse.ok(res, "Workout plans retrieved", { workoutPlans });
  } catch (err) {
    return next(err);
  }
}

async function getCurrentClientWorkoutPlansHandler(req, res, next) {
  try {
    const workoutPlans = await getWorkoutPlansForCurrentClient(req.user);
    return ApiResponse.ok(res, "Workout plans retrieved", { workoutPlans });
  } catch (err) {
    return next(err);
  }
}

async function getWorkoutPlanHandler(req, res, next) {
  try {
    const workoutPlan = await getWorkoutPlanById(req.user, req.params.id);
    return ApiResponse.ok(res, "Workout plan retrieved", { workoutPlan });
  } catch (err) {
    return next(err);
  }
}

async function updateWorkoutPlanHandler(req, res, next) {
  try {
    const workoutPlan = await updateWorkoutPlan(req.user, req.params.id, req.body);
    return ApiResponse.ok(res, "Workout plan updated", { workoutPlan });
  } catch (err) {
    return next(err);
  }
}

async function publishWorkoutPlanHandler(req, res, next) {
  try {
    const workoutPlan = await publishWorkoutPlan(req.user, req.params.id);
    return ApiResponse.ok(res, "Workout plan published", { workoutPlan });
  } catch (err) {
    return next(err);
  }
}

async function archiveWorkoutPlanHandler(req, res, next) {
  try {
    const workoutPlan = await archiveWorkoutPlan(req.user, req.params.id);
    return ApiResponse.ok(res, "Workout plan archived", { workoutPlan });
  } catch (err) {
    return next(err);
  }
}

async function deleteWorkoutPlanHandler(req, res, next) {
  try {
    const result = await deleteWorkoutPlan(req.user, req.params.id);
    return ApiResponse.ok(res, "Workout plan deleted", result);
  } catch (err) {
    return next(err);
  }
}

async function reassignWorkoutPlanHandler(req, res, next) {
  try {
    const targetClientId = req.body?.clientId;
    if (!targetClientId) {
      return ApiResponse.send(res, 400, "Target clientId is required", { errors: { clientId: "Required." } });
    }
    const workoutPlan = await reassignWorkoutPlan(req.user, req.params.id, targetClientId);
    return ApiResponse.created(res, "Workout plan reassigned", { workoutPlan });
  } catch (err) {
    return next(err);
  }
}

async function getWorkoutCompletionHandler(req, res, next) {
  try {
    const completions = await getWorkoutCompletionHistory(req.user, req.params.id);
    return ApiResponse.ok(res, "Workout completion history retrieved", { completions });
  } catch (err) {
    return next(err);
  }
}

async function completeExerciseHandler(req, res, next) {
  try {
    const completion = await completeExercise(req.user, req.params.id, req.params.exerciseId);
    return ApiResponse.created(res, "Exercise marked as completed", { completion });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createWorkoutPlanHandler,
  getWorkoutPlansHandler,
  getCurrentClientWorkoutPlansHandler,
  getWorkoutPlanHandler,
  updateWorkoutPlanHandler,
  publishWorkoutPlanHandler,
  archiveWorkoutPlanHandler,
  deleteWorkoutPlanHandler,
  reassignWorkoutPlanHandler,
  getWorkoutCompletionHandler,
  completeExerciseHandler
};
