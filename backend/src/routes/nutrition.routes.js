"use strict";

const { Router } = require("express");
const {
  createHandler,
  listForClientHandler,
  listForCurrentClientHandler,
  getHandler,
  updateHandler,
  publishHandler,
  archiveHandler,
  deleteHandler,
  reassignHandler,
} = require("../controllers/nutritionPlan.controller");
const authenticate = require("../middleware/auth");

const router = Router();

router.use(authenticate);

router.get("/client/me",          listForCurrentClientHandler);
router.post("/client/:clientId",  createHandler);
router.get("/client/:clientId",   listForClientHandler);

router.post("/:id/publish",  publishHandler);
router.post("/:id/archive",  archiveHandler);
router.post("/:id/reassign", reassignHandler);

router.get("/:id",    getHandler);
router.patch("/:id",  updateHandler);
router.delete("/:id", deleteHandler);

module.exports = router;
