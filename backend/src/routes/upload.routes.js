"use strict";

const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const { sign } = require("../controllers/upload.controller");

const router = Router();

router.use(authenticate);

// Signed direct-upload params for progress photos. Same roles that may
// upload a photo set may request a signature.
router.post("/sign", allowRoles("TRAINER", "ADMIN", "CLIENT"), sign);

module.exports = router;
