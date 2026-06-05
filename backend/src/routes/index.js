"use strict";

const { Router } = require("express");
const healthRouter        = require("./health.routes");
const authRouter          = require("./auth.routes");
const clientRouter        = require("./client.routes");
const trainerRouter       = require("./trainer.routes");
const checkinRouter       = require("./checkin.routes");
const progressPhotoRouter = require("./progressPhoto.routes");

const router = Router();

router.use("/health",           healthRouter);
router.use("/auth",             authRouter);
router.use("/clients",          clientRouter);
router.use("/trainer",          trainerRouter);
router.use("/checkins",         checkinRouter);
router.use("/progress-photos",  progressPhotoRouter);

module.exports = router;
