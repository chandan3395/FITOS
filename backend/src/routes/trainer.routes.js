"use strict";

const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const { getMetrics } = require("../controllers/trainer.controller");

const router = Router();

// All trainer routes require authentication and the TRAINER role.
// Admins are deliberately excluded — per the privacy rule they should
// not see per-trainer client counts via this endpoint.
router.use(authenticate, allowRoles("TRAINER"));

router.get("/metrics", getMetrics);

module.exports = router;
