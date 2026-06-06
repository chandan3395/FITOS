"use strict";

const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const c = require("../controllers/nutritionTemplate.controller");

const router = Router();

router.use(authenticate, allowRoles("TRAINER"));

router.get("/",              c.list);
router.post("/",             c.create);
router.get("/:id",           c.getOne);
router.patch("/:id",         c.update);
router.post("/:id/duplicate", c.duplicate);
router.post("/:id/assign",   c.assign);
router.post("/:id/archive",  c.archive);
router.delete("/:id",        c.remove);

module.exports = router;
