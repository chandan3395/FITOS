"use strict";
const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const service = require("../services/byot.service");
const handle = require("../middleware/byotResponse");
const router = Router();
router.use(authenticate, allowRoles("BYOT"));
router.use("/progress", require("./byotProgress.routes"));
router.use("/workouts", require("./byotWorkout.routes"));
router.use("/nutrition", require("./byotNutrition.routes"));
router.get(
  "/profile",
  handle(async (req) => service.serialize(await service.ensureProfile(req.user._id)))
);
router.post(
  "/onboarding",
  handle(async (req) => service.serialize(await service.onboard(req.user._id, req.body)))
);
module.exports = router;
