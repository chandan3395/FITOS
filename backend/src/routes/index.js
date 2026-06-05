"use strict";

const { Router } = require("express");
const healthRouter = require("./health.routes");
const authRouter = require("./auth.routes");
const clientRouter = require("./client.routes");

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/clients", clientRouter);

module.exports = router;
