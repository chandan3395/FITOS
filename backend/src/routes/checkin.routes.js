"use strict";

const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const { create, list, getOne, review } = require("../controllers/checkin.controller");

const router = Router();

// Check-in surfaces are trainer/admin only — admin retains read access for
// support; the ownership filter still applies inside the service.
router.use(authenticate, allowRoles("TRAINER", "ADMIN"));

router.post("/",            create);
router.get("/",             list);
router.get("/:id",          getOne);
router.patch("/:id/review", review);

module.exports = router;
