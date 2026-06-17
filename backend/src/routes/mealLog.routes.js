"use strict";

const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const {
  create,
  listForCurrentClient,
  today,
  listForClient,
  review,
} = require("../controllers/mealLog.controller");

const router = Router();

router.use(authenticate);

// Client logs a meal (clientId resolved from auth; TRAINER/ADMIN may pass one).
router.post("/", allowRoles("TRAINER", "ADMIN", "CLIENT"), create);

// Client-facing reads.
router.get("/me",    allowRoles("CLIENT"), listForCurrentClient);
router.get("/today", allowRoles("CLIENT"), today);

// Trainer/admin review surfaces.
router.get("/client/:id", allowRoles("TRAINER", "ADMIN"), listForClient);
router.patch("/:id/entries/:entryId/review", allowRoles("TRAINER", "ADMIN"), review);

module.exports = router;
