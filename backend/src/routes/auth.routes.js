"use strict";

const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const { env } = require("../config/env");
const {
  adminLogin,
  confirmLink,
  refresh,
  logout,
  createAdmin,
  getCurrentUser,
  getInvite,
  activateInvite,
} = require("../controllers/auth.controller");

const router = Router();

router.post("/admin/create", authenticate, allowRoles("ADMIN"), createAdmin);

// Admin login — the only email + password path. Trainers and clients
// authenticate exclusively through Google OAuth below.
router.post("/admin/login", adminLogin);

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
    // An invite token means this is a client activating from their invite
    // link — force the CLIENT role and carry the token through OAuth `state`
    // so the callback can link the Google account to the invited profile.
    const inviteToken = req.query.invite ? String(req.query.invite) : null;
    const role = inviteToken
      ? "CLIENT"
      : (req.query.role === "TRAINER" ? "TRAINER" : "CLIENT");
    const statePayload = { role };
    if (inviteToken) statePayload.invite = inviteToken;
    const state = Buffer.from(JSON.stringify(statePayload)).toString("base64");
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

// Client invite — public (the token is the secret)
router.get("/invite/:token",           getInvite);
router.post("/invite/:token/activate", activateInvite);

// Confirm a Google-account link when the invited and Google emails differ.
// Public — authorization comes from the signed linkToken in the body.
router.post("/invite/link/confirm",    confirmLink);

module.exports = router;
