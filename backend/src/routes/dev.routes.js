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
// can populate its "impersonate as client" dropdown.
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

// POST /api/dev/session  { role, clientId? }
// Persists the active dev identity as cookies so any subsequent request
// (axios OR direct browser hit) resolves to the same impersonation.
// Cookies are intentionally NOT httpOnly — the frontend may want to read
// them for debugging; they carry no real privilege outside dev bypass.
router.post("/session", (req, res) => {
  const VALID = ["ADMIN", "TRAINER", "CLIENT"];
  const rawRole = String(req.body?.role || "").toUpperCase();
  const role = VALID.includes(rawRole) ? rawRole : null;
  const clientId = req.body?.clientId;
  const opts = { httpOnly: false, sameSite: "lax", path: "/" };

  if (role) res.cookie("dev_role", role, opts);
  if (clientId === null || clientId === "") {
    res.clearCookie("dev_client_id", { path: "/" });
  } else if (clientId) {
    res.cookie("dev_client_id", String(clientId), opts);
  }
  // eslint-disable-next-line no-console
  console.log("[dev-bypass] /dev/session ->", { role, clientId });
  return ApiResponse.ok(res, "dev session set", { role, clientId: clientId ?? null });
});

module.exports = router;
