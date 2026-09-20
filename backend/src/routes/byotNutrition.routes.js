"use strict";
const { Router } = require("express");
const service = require("../services/byotNutrition.service");
const handle = require("../middleware/byotResponse");
const router = Router();
// Mounted AFTER the parent BYOT authentication/role guard. No owner parameters.
router.get(
  "/day",
  handle((req) => service.read(req.user._id, req.query.date))
);
router.get(
  "/summary",
  handle(async (req) => (await service.read(req.user._id, req.query.date)).summary)
);
router.get(
  "/plan",
  handle(async (req) => (await service.read(req.user._id)).plan)
);
router.put(
  "/plan",
  handle((req) => service.savePlan(req.user._id, req.body, req.get("Idempotency-Key")))
);
router.delete(
  "/plan",
  handle((req) => service.savePlan(req.user._id, req.body, req.get("Idempotency-Key"), true))
);
router.get(
  "/logs/:date",
  handle(async (req) => (await service.read(req.user._id, req.params.date)).log)
);
router.put(
  "/logs/:date",
  handle((req) =>
    service.saveLog(req.user._id, req.params.date, req.body, req.get("Idempotency-Key"))
  )
);
router.delete(
  "/logs/:date",
  handle((req) =>
    service.saveLog(req.user._id, req.params.date, req.body, req.get("Idempotency-Key"), true)
  )
);
module.exports = router;
