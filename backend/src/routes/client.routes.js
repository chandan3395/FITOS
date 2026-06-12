"use strict";

const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const {
  createClient,
  listClients,
  getClient,
  updateClient,
  deleteClient,
  regenerateInvite,
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

// DELETE — soft-delete a client (non-destructive; reversible).
router.delete("/:id", authenticate, allowRoles("ADMIN", "TRAINER"), deleteClient);

// POST /api/clients/:id/invite/regenerate — invalidate old invite(s) and mint a fresh link.
router.post("/:id/invite/regenerate", authenticate, allowRoles("ADMIN", "TRAINER"), regenerateInvite);

// POST /api/clients/:id/invite — (re)send the activation invite via WhatsApp.
router.post("/:id/invite", authenticate, allowRoles("ADMIN", "TRAINER"), sendInvite);

module.exports = router;
