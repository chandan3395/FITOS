"use strict";

const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const { create, list, listMine, getOne, review } = require("../controllers/checkin.controller");

const router = Router();

router.use(authenticate);

// Clients submit their own check-ins (clientId resolved server-side from
// the auth context); trainers + admins continue to POST on a client's
// behalf using the body's clientId for the prototype path.
router.post("/", allowRoles("TRAINER", "ADMIN", "CLIENT"), create);

// CLIENT-facing read — own history only.
router.get("/me", allowRoles("CLIENT"), listMine);

// Read/review surfaces remain trainer/admin only.
router.get("/",             allowRoles("TRAINER", "ADMIN"), list);
router.get("/:id",          allowRoles("TRAINER", "ADMIN"), getOne);
router.patch("/:id/review", allowRoles("TRAINER", "ADMIN"), review);

module.exports = router;
