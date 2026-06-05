"use strict";

const { Router } = require("express");
const passport = require("../config/passport");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const { adminLogin, googleCallback, refresh, logout, createAdmin, getCurrentUser } = require("../controllers/auth.controller");

const router = Router();

router.post("/admin/create", authenticate, allowRoles("ADMIN"), createAdmin);

// Admin login
router.post("/admin/login", adminLogin);

// Google OAuth — role (TRAINER or CLIENT) is carried through the OAuth state parameter.
router.get("/google", (req, res, next) => {
  const role = req.query.role === "TRAINER" ? "TRAINER" : "CLIENT";
  const state = Buffer.from(JSON.stringify({ role })).toString("base64");
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    state,
  })(req, res, next);
});

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/api/auth/google/failure" }),
  googleCallback
);

router.get("/google/failure", (_req, res) => {
  res.status(401).json({ success: false, message: "Google authentication failed" });
});

router.post("/refresh", refresh);
router.post("/logout", logout);

router.get("/me", authenticate, getCurrentUser);

module.exports = router;
