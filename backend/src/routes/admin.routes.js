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
  listAdmins,
  createAdmin,
  disableAdmin,
  enableAdmin,
  deleteAdmin,
} = require("../controllers/admin.controller");

const router = Router();

router.use(authenticate, allowRoles("ADMIN"));

// Trainer management (existing).
router.get("/trainers",              listTrainers);
router.post("/trainers",             createTrainer);
router.post("/trainers/:id/disable", disableTrainer);
router.post("/trainers/:id/enable",  enableTrainer);

// Admin management (new). Safety rules — cannot disable self, cannot
// disable/delete the last active admin — are enforced in the service.
router.get("/admins",              listAdmins);
router.post("/admins",             createAdmin);
router.post("/admins/:id/disable", disableAdmin);
router.post("/admins/:id/enable",  enableAdmin);
router.delete("/admins/:id",       deleteAdmin);

router.get("/metrics", getPlatformMetrics);

module.exports = router;
