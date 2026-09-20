"use strict";

const { Router } = require("express");
const authenticate = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const { authLimiter } = require("../middleware/rateLimit");
const { env } = require("../config/env");
const {
  adminLogin,
  login,
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

// Admin login — dedicated admin email + password path. Preserved verbatim;
// admin behaviour is unchanged (admins still sign in here, never via Google).
router.post("/admin/login", authLimiter, adminLogin);

// Generic email + password login for ADMIN/TRAINER/CLIENT. Powers the demo
// accounts (and any account with a password) without requiring Google OAuth.
// Google sign-in below continues to work unchanged.
router.post("/login", authLimiter, login);

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

  const oauthState = require("../utils/oauthState");
  router.get("/google", authLimiter, async (req, res, next) => {
    try {
      const state = await oauthState.begin(req, res);
      passport.authenticate("google", { scope: ["profile", "email"], session: false, state, prompt: "select_account" })(req, res, next);
    } catch (err) { next(err); }
  });
  router.get("/google/callback", async (req, res, next) => {
    try {
      req.oauthState = await oauthState.consume(req);
      res.clearCookie(oauthState.COOKIE, { ...oauthState.options, maxAge: undefined });
      if (!req.oauthState) return res.redirect(`${env.CLIENT_ORIGIN}/byot?error=invalid_state`);
      passport.authenticate("google", { session: false }, (err, user, info) => {
        if (err || !user) {
          const path = req.oauthState.intent === "BYOT" ? "/byot" : "/login";
          const code = info?.code === "account_conflict" ? "account_conflict" : "google_failed";
          return res.redirect(`${env.CLIENT_ORIGIN}${path}?error=${code}`);
        }
        req.user = user;
        return googleCallback(req, res, next);
      })(req, res, next);
    } catch (err) { next(err); }
  });

  router.get("/google/failure", (_req, res) => {
    res.status(401).json({ success: false, message: "Google authentication failed" });
  });
} else {
  const disabled = (_req, res) => res.status(503).json({
    success: false,
    message: "Google sign-in is currently disabled.",
  });
  router.get("/google", (req, res) => req.query.intent === "byot" ? res.redirect(`${env.CLIENT_ORIGIN}/byot?error=google_disabled`) : disabled(req, res));
  router.get("/google/callback",  disabled);
  router.get("/google/failure",   disabled);
}

router.post("/refresh", require("../middleware/cookieOrigin"), authLimiter, refresh);
router.post("/logout", require("../middleware/cookieOrigin"), logout);

router.get("/me", authenticate, getCurrentUser);

// Client invite — public (the token is the secret)
router.get("/invite/:token",           getInvite);
router.post("/invite/:token/activate", authLimiter, activateInvite);

// Confirm a Google-account link when the invited and Google emails differ.
// Public — authorization comes from the signed linkToken in the body.
router.post("/invite/link/confirm",    confirmLink);

module.exports = router;
