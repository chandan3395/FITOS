"use strict";

const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const { list, listMine } = require("../controllers/activity.controller");

const router = Router();

// Client's own activity feed (Recent Activity on the client dashboard).
router.get("/me", authenticate, allowRoles("CLIENT"), listMine);

// Trainer / admin workspace feed.
router.get("/", authenticate, allowRoles("TRAINER", "ADMIN"), list);

module.exports = router;
