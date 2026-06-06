"use strict";

const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const { upload } = require("../middleware/upload");
const {
  create,
  listForClient,
  comment,
  setStatus,
  remove,
} = require("../controllers/progressPhoto.controller");

const router = Router();

router.use(authenticate, allowRoles("TRAINER", "ADMIN"));

// Three optional file slots — trainer can upload Front / Side / Back.
router.post(
  "/",
  upload.fields([
    { name: "front", maxCount: 1 },
    { name: "side",  maxCount: 1 },
    { name: "back",  maxCount: 1 },
  ]),
  create
);

router.get("/client/:id",     listForClient);
router.patch("/:id/comment",  comment);
router.patch("/:id/status",   setStatus);
router.delete("/:id",         remove);

module.exports = router;
