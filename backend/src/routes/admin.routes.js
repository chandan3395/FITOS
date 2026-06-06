"use strict";

const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const {
  listTrainers,
  createTrainer,
  disableTrainer,
  enableTrainer,
  getPlatformMetrics,
} = require("../controllers/admin.controller");

const router = Router();

router.use(authenticate, allowRoles("ADMIN"));

router.get("/trainers",             listTrainers);
router.post("/trainers",            createTrainer);
router.post("/trainers/:id/disable", disableTrainer);
router.post("/trainers/:id/enable",  enableTrainer);
router.get("/metrics",              getPlatformMetrics);

module.exports = router;
