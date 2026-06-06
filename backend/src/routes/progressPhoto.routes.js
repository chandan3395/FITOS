"use strict";

const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const {
  create,
  listForClient,
  listForCurrentClient,
  comment,
  setStatus,
  remove,
} = require("../controllers/progressPhoto.controller");

const router = Router();

router.use(authenticate);

// Metadata-only upsert. Browser uploads bytes straight to Cloudinary, then
// posts the resulting per-slot publicIds here. CLIENT path resolves clientId
// from auth; TRAINER/ADMIN pass it in the JSON body.
router.post(
  "/",
  allowRoles("TRAINER", "ADMIN", "CLIENT"),
  create
);

// Client-facing — own photos only.
router.get("/me", allowRoles("CLIENT"), listForCurrentClient);

// Trainer/admin read + review surfaces.
router.get("/client/:id",     allowRoles("TRAINER", "ADMIN"), listForClient);
router.patch("/:id/comment",  allowRoles("TRAINER", "ADMIN"), comment);
router.patch("/:id/status",   allowRoles("TRAINER", "ADMIN"), setStatus);
router.delete("/:id",         allowRoles("TRAINER", "ADMIN"), remove);

module.exports = router;
