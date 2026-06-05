"use strict";

const { Router } = require("express");
const healthRouter = require("./health.routes");

const router = Router();

router.use("/health", healthRouter);

module.exports = router;
