"use strict";

const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const { list } = require("../controllers/activity.controller");

const router = Router();

router.use(authenticate, allowRoles("TRAINER", "ADMIN"));
router.get("/", list);

module.exports = router;
