"use strict";

const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const {
  listTrainers,
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

// Trainer management. Trainers self-register via Google sign-in, so there
// is no create route — admins can only list, enable, and disable them.
router.get("/trainers",              listTrainers);
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
