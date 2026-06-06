"use strict";

const { Router } = require("express");
const {
  createWorkoutPlanHandler,
  getWorkoutPlansHandler,
  getCurrentClientWorkoutPlansHandler,
  getWorkoutPlanHandler,
  updateWorkoutPlanHandler,
  deleteWorkoutPlanHandler,
  getWorkoutCompletionHandler,
  completeExerciseHandler
} = require("../controllers/workoutPlan.controller");
const authenticate = require("../middleware/auth");

const router = Router();

router.use(authenticate);

router.get("/client/me", getCurrentClientWorkoutPlansHandler);
router.post("/client/:clientId", createWorkoutPlanHandler);
router.get("/client/:clientId", getWorkoutPlansHandler);

router.get("/:id/completions", getWorkoutCompletionHandler);
router.post("/:id/exercises/:exerciseId/complete", completeExerciseHandler);

router.get("/:id", getWorkoutPlanHandler);
router.patch("/:id", updateWorkoutPlanHandler);
router.delete("/:id", deleteWorkoutPlanHandler);

module.exports = router;
