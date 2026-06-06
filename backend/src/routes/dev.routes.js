"use strict";

// Dev-only endpoints. Mounted at /api/dev. The entire router 404s
// unless DEV_AUTH_BYPASS=true is set in the environment, so production
// deployments expose nothing here even if the file is shipped.

const { Router } = require("express");
const { Client } = require("../schemas/Client.schema");
const ApiResponse = require("../utils/ApiResponse");

const router = Router();

router.use((_req, res, next) => {
  if (process.env.DEV_AUTH_BYPASS !== "true") return res.status(404).end();
  next();
});

// GET /api/dev/clients
// Returns every Client doc in the DB (capped) so the dev role switcher
// can populate its "impersonate as client" dropdown. No ownership filter
// — this exists only to power test tooling.
router.get("/clients", async (_req, res, next) => {
  try {
    const clients = await Client.find({}, "name status trainerId userId createdAt goal")
      .populate("trainerId", "name email")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return ApiResponse.ok(res, "ok", { clients });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
