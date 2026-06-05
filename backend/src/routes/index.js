"use strict";

const { Router } = require("express");
const healthRouter = require("./health.routes");
const authRouter = require("./auth.routes");

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);

module.exports = router;
