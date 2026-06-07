"use strict";

const { Router } = require("express");
const healthRouter        = require("./health.routes");
const authRouter          = require("./auth.routes");
const clientRouter        = require("./client.routes");
const trainerRouter       = require("./trainer.routes");
const adminRouter         = require("./admin.routes");
const checkinRouter       = require("./checkin.routes");
const progressPhotoRouter = require("./progressPhoto.routes");
const uploadRouter        = require("./upload.routes");
const workoutRouter       = require("./workout.routes");
const nutritionRouter     = require("./nutrition.routes");
const workoutTemplateRouter   = require("./workoutTemplate.routes");
const nutritionTemplateRouter = require("./nutritionTemplate.routes");
const activityRouter      = require("./activity.routes");

const router = Router();

router.use("/health",           healthRouter);
router.use("/auth",             authRouter);
router.use("/clients",          clientRouter);
router.use("/trainer",          trainerRouter);
router.use("/admin",            adminRouter);
router.use("/checkins",         checkinRouter);
router.use("/progress-photos",  progressPhotoRouter);
router.use("/uploads",          uploadRouter);
router.use("/workouts",         workoutRouter);
router.use("/nutrition",            nutritionRouter);
router.use("/workout-templates",    workoutTemplateRouter);
router.use("/nutrition-templates",  nutritionTemplateRouter);
router.use("/activity",         activityRouter);

module.exports = router;
