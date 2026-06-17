"use strict";

const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const { list, resolve, history, markRead, send } = require("../controllers/conversation.controller");

const router = Router();

router.use(authenticate);
// Messaging is trainer↔assigned-client only — admins are never participants.
router.use(allowRoles("TRAINER", "CLIENT"));

// The signed-in user's conversation list (sorted by last activity).
router.get("/", list);

// Resolve/open the conversation for a pair WITHOUT materializing it.
// Trainer passes ?clientId=...; client uses self.
router.get("/resolve", resolve);

// REST send fallback — shares the socket persist-then-emit path.
router.post("/send", send);

// Paginated history + mark-read for a specific conversation.
router.get("/:id/messages", history);
router.post("/:id/read", markRead);

module.exports = router;
