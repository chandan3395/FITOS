"use strict";

const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const { sign, signMeal, signMealLog } = require("../controllers/upload.controller");

const router = Router();

router.use(authenticate);

// Signed direct-upload params for progress photos. Same roles that may
// upload a photo set may request a signature.
router.post("/sign", allowRoles("TRAINER", "ADMIN", "CLIENT"), sign);

// Signed direct-upload params for one meal-check-in photo.
router.post("/sign-meal", allowRoles("TRAINER", "ADMIN", "CLIENT"), signMeal);

// Signed direct-upload params for one Nutrition v2 meal-LOG photo.
router.post("/sign-meal-log", allowRoles("TRAINER", "ADMIN", "CLIENT"), signMealLog);

module.exports = router;
