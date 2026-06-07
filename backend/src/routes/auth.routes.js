"use strict";

const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const { env } = require("../config/env");
const {
  login,
  setPassword,
  adminLogin,
  trainerLogin,
  trainerSignup,
  refresh,
  logout,
  createAdmin,
  getCurrentUser,
  getInvite,
  activateInvite,
} = require("../controllers/auth.controller");

const router = Router();

router.post("/admin/create", authenticate, allowRoles("ADMIN"), createAdmin);

// Role-agnostic email + password login (the CLIENT login path).
router.post("/login", login);

// Admin login
router.post("/admin/login", adminLogin);

// Trainer signup + password login
router.post("/trainer/signup", trainerSignup);
router.post("/trainer/login",  trainerLogin);

// ── Google OAuth — gated by ENABLE_GOOGLE_AUTH feature flag.
// When disabled, the implementation is preserved but never reached:
// no passport instance is loaded, and the routes return 503 so
// the frontend can render a clean "disabled" state. Setting the
// flag back to true (default) restores the previous behavior.
if (env.ENABLE_GOOGLE_AUTH) {
  // Lazy-required so passport's strategy registration (which reads
  // GOOGLE_CLIENT_ID etc.) only runs when the feature is enabled.
  const passport = require("../config/passport");
  const { googleCallback } = require("../controllers/auth.controller");

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
    passport.authenticate("google", {
      session: false,
      failureRedirect: `${env.CLIENT_ORIGIN}/login?error=google_failed`,
    }),
    googleCallback
  );

  router.get("/google/failure", (_req, res) => {
    res.status(401).json({ success: false, message: "Google authentication failed" });
  });
} else {
  const disabled = (_req, res) => res.status(503).json({
    success: false,
    message: "Google sign-in is currently disabled.",
  });
  router.get("/google",           disabled);
  router.get("/google/callback",  disabled);
  router.get("/google/failure",   disabled);
}

router.post("/refresh", refresh);
router.post("/logout",  logout);

router.get("/me", authenticate, getCurrentUser);

// Set / change password — trainers & clients (incl. Google-created accounts).
router.post("/password", authenticate, allowRoles("TRAINER", "CLIENT"), setPassword);

// Client invite — public (the token is the secret)
router.get("/invite/:token",           getInvite);
router.post("/invite/:token/activate", activateInvite);

module.exports = router;
