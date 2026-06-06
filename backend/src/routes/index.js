"use strict";

const { Router } = require("express");
const healthRouter        = require("./health.routes");
const authRouter          = require("./auth.routes");
const clientRouter        = require("./client.routes");
const trainerRouter       = require("./trainer.routes");
const adminRouter         = require("./admin.routes");
const checkinRouter       = require("./checkin.routes");
const progressPhotoRouter = require("./progressPhoto.routes");
const workoutRouter       = require("./workout.routes");

const router = Router();

router.use("/health",           healthRouter);
router.use("/auth",             authRouter);
router.use("/clients",          clientRouter);
router.use("/trainer",          trainerRouter);
router.use("/admin",            adminRouter);
router.use("/checkins",         checkinRouter);
router.use("/progress-photos",  progressPhotoRouter);
router.use("/workouts",         workoutRouter);

module.exports = router;
