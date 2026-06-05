"use strict";

const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const { createClient } = require("../controllers/client.controller");

const router = Router();

// POST /api/clients — only TRAINER and ADMIN may create clients.
// CLIENT role is blocked at the role middleware (403).
router.post("/", authenticate, allowRoles("ADMIN", "TRAINER"), createClient);

module.exports = router;
