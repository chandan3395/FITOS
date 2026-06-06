"use strict";

const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const { upload } = require("../middleware/upload");
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

// Three optional file slots — trainer or client can upload Front/Side/Back.
// CLIENT path resolves clientId from auth; TRAINER/ADMIN pass it in body.
router.post(
  "/",
  allowRoles("TRAINER", "ADMIN", "CLIENT"),
  upload.fields([
    { name: "front", maxCount: 1 },
    { name: "side",  maxCount: 1 },
    { name: "back",  maxCount: 1 },
  ]),
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
