"use strict";
const { Router } = require("express");
const service = require("../services/byotWorkout.service");
const handle = require("../middleware/byotResponse");
const router = Router();
router.get(
  "/routine",
  handle((req) => service.getRoutine(req.user._id))
);
router.put(
  "/routine",
  handle((req) => service.saveRoutine(req.user._id, req.body, req.get("Idempotency-Key")))
);
router.delete(
  "/routine",
  handle((req) => service.saveRoutine(req.user._id, req.body, req.get("Idempotency-Key"), true))
);
router.get(
  "/day",
  handle((req) => service.readDay(req.user._id, req.query.date))
);
router.post(
  "/days/:date/start",
  handle((req) =>
    service.writeDay(req.user._id, req.params.date, req.body, req.get("Idempotency-Key"))
  )
);
router.put(
  "/days/:date/exercises/:exerciseId",
  handle((req) =>
    service.writeDay(
      req.user._id,
      req.params.date,
      req.body,
      req.get("Idempotency-Key"),
      req.params.exerciseId
    )
  )
);
module.exports = router;
