"use strict";

const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const {
  createClient,
  listClients,
  getClient,
  updateClient,
  sendInvite,
} = require("../controllers/client.controller");

const router = Router();

// POST /api/clients
// TRAINER + ADMIN may create clients.
// (ADMIN must pass trainerId; TRAINER uses own _id.)
router.post("/", authenticate, allowRoles("ADMIN", "TRAINER"), createClient);

// GET /api/clients and GET /api/clients/:id
// Phase 5 privacy rule: only TRAINER may list/retrieve client records.
// ADMIN is forbidden — admins get trainer-level analytics, not client details.
// CLIENT is forbidden.
router.get("/", authenticate, allowRoles("TRAINER"), listClients);
router.get("/:id", authenticate, allowRoles("TRAINER"), getClient);

// PATCH — update editable fields (incl. status="ARCHIVED" for archive flow).
router.patch("/:id", authenticate, allowRoles("ADMIN", "TRAINER"), updateClient);

// POST /api/clients/:id/invite — (re)send the activation invite via WhatsApp.
router.post("/:id/invite", authenticate, allowRoles("ADMIN", "TRAINER"), sendInvite);

module.exports = router;
