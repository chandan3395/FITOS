"use strict";

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../schemas/User.schema");
const { Client } = require("../schemas/Client.schema");
const { ClientInvite } = require("../schemas/ClientInvite.schema");
const { validateActivationPayload } = require("../validators/activationPayload.validator");
const generateAccessToken = require("../utils/generateAccessToken");
const generateRefreshToken = require("../utils/generateRefreshToken");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const { env } = require("../config/env");
const activityService = require("../services/activity.service");
const accountLinking = require("../services/accountLinking.service");

const REFRESH_COOKIE = "refreshToken";

// In production the frontend and backend are served from different domains,
// so the refresh cookie must be SameSite=None + Secure to survive the Google
// OAuth cross-site redirect. In development they share localhost, so Lax +
// non-secure keeps the cookie working over plain HTTP.
const IS_PROD = env.NODE_ENV === "production";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? "none" : "lax",
};

function buildSafeUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    profileImage: user.profileImage,
  };
}

async function issueTokens(user, res) {
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save();

  res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
  return accessToken;
}

async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    // Stored admin emails are lowercased (see createAdmin + schema), so
    // normalize the lookup to avoid a casing mismatch locking admins out.
    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail, role: "ADMIN" }).select("+password");
    if (!user) {
      throw new ApiError(401, "Invalid credentials");
    }
    if (!user.isActive) {
      throw new ApiError(403, "Account disabled");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new ApiError(401, "Invalid credentials");
    }

    const accessToken = await issueTokens(user, res);

    return ApiResponse.ok(res, "Login successful", { accessToken, user: buildSafeUser(user) });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 *
 * Generic email + password sign-in for ANY role (ADMIN, TRAINER, CLIENT).
 * Added so the permanent demo accounts (and any account that has set a
 * password) can sign in without Google. This does NOT replace or modify
 * `adminLogin` — that dedicated admin path is preserved verbatim — and it
 * leaves Google OAuth fully intact.
 *
 * Accounts created via Google have no password (`password` is unset); for
 * those we return a clear message rather than a generic failure so the user
 * knows to use "Continue with Google" instead.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    if (!user) {
      throw new ApiError(401, "Invalid credentials");
    }
    if (!user.isActive) {
      throw new ApiError(403, "Account disabled");
    }
    // Google-only account (no password set) — guide them to the right path
    // instead of a misleading "invalid credentials".
    if (!user.password) {
      throw new ApiError(401, "This account has no password set. Please sign in with Google.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new ApiError(401, "Invalid credentials");
    }

    const accessToken = await issueTokens(user, res);

    return ApiResponse.ok(res, "Login successful", { accessToken, user: buildSafeUser(user) });
  } catch (err) {
    next(err);
  }
}

// Decode the base64-JSON OAuth `state` we set on the /google route.
function decodeState(raw) {
  try {
    return JSON.parse(Buffer.from(String(raw || ""), "base64").toString("utf8")) || {};
  } catch {
    return {};
  }
}

// Redirect helper: hand the access token to the SPA via the URL fragment
// (never logged server-side) so GoogleCallbackPage can finish the sign-in.
function redirectWithToken(res, accessToken, role) {
  const params = new URLSearchParams({ token: accessToken, role });
  return res.redirect(`${env.CLIENT_ORIGIN}/auth/google/callback#${params.toString()}`);
}

/**
 * Google OAuth callback handler.
 *
 * Two modes, distinguished by whether the OAuth `state` carried an invite
 * token (set when the client started from their activation link):
 *
 *   - No invite  → ordinary sign-in (trainer, or an already-linked client).
 *   - Invite     → account-linking flow (see handleInviteLink): attach this
 *                  Google account to the invited Client profile, confirming
 *                  first if the invited and Google emails differ.
 */
async function googleCallback(req, res, _next) {
  try {
    if (!req.user) {
      throw new ApiError(401, "Google authentication failed");
    }
    if (!req.user.isActive) {
      // A disabled trainer who tries to sign in lands on a dedicated
      // "Account Disabled" screen (not a silent bounce back to login).
      // Record the attempt so admins can see it in the trainer's feed.
      if (req.user.role === "TRAINER") {
        await activityService.record({
          trainerId: req.user._id,
          actorId:   req.user._id,
          actorRole: "TRAINER",
          type:      "TRAINER_DISABLED_LOGIN_ATTEMPT",
          summary:   `${req.user.name} attempted to sign in while disabled`,
        });
      }
      return res.redirect(`${env.CLIENT_ORIGIN}/account-disabled`);
    }

    const { invite: inviteToken } = decodeState(req.query.state);
    if (inviteToken) {
      return handleInviteLink(req, res, inviteToken);
    }

    const accessToken = await issueTokens(req.user, res);
    return redirectWithToken(res, accessToken, req.user.role);
  } catch (err) {
    // On failure, send the user back to the login page with an error flag.
    return res.redirect(`${env.CLIENT_ORIGIN}/login?error=google_failed`);
  }
}

/**
 * Invite-driven Google sign-in. The Client profile (created by the trainer)
 * is the source of truth; the Google account is attached to it.
 *
 *   - emails match (or same already-linked user) → link immediately + sign in.
 *   - emails differ                              → defer to a confirmation
 *     screen carrying a signed link token (no linking happens yet).
 *
 * All failures redirect back to the activation page with an error code rather
 * than throwing, so the client always lands somewhere meaningful.
 */
async function handleInviteLink(req, res, inviteToken) {
  const activatePath = `${env.CLIENT_ORIGIN}/activate/${encodeURIComponent(inviteToken)}`;
  try {
    const { invite, client } = await accountLinking.resolveInviteAndClient(inviteToken);
    const googleUser = req.user;

    if (googleUser.role !== "CLIENT") {
      return res.redirect(`${activatePath}?error=not_a_client`);
    }

    // Security: this Google account must not already back another profile.
    await accountLinking.assertGoogleNotLinkedElsewhere(googleUser._id, client._id);

    // Profile already linked to a *different* account → refuse.
    if (client.userId && String(client.userId) !== String(googleUser._id)) {
      return res.redirect(`${activatePath}?error=already_linked`);
    }

    const invitedEmail   = accountLinking.invitedEmailOf(invite, client);
    const googleEmail    = String(googleUser.email || "").toLowerCase();
    const emailsMatch    = Boolean(invitedEmail) && invitedEmail === googleEmail;
    const sameLinkedUser = client.userId && String(client.userId) === String(googleUser._id);

    // Match (or re-activation by the same linked user) → link now, sign in.
    if (emailsMatch || sameLinkedUser) {
      await accountLinking.performLink({ invite, client, googleUser });
      const accessToken = await issueTokens(googleUser, res);
      return redirectWithToken(res, accessToken, "CLIENT");
    }

    // Mismatch → defer. Sign a tamper-proof token identifying exactly what to
    // link, and send the browser to the confirmation screen.
    const linkToken = accountLinking.signLinkToken({
      inviteToken,
      clientId: client._id,
      googleUserId: googleUser._id,
    });
    const params = new URLSearchParams({ linkToken, invitedEmail, googleEmail, clientName: client.name });
    return res.redirect(`${activatePath}/link#${params.toString()}`);
  } catch (err) {
    const code =
      err?.statusCode === 409 ? "account_in_use" :
      err?.statusCode === 410 ? "expired" :
      err?.statusCode === 404 ? "invite_invalid" :
      "link_failed";
    return res.redirect(`${activatePath}?error=${code}`);
  }
}

/**
 * POST /api/auth/invite/link/confirm
 * Public — completes a deferred (email-mismatch) link after the client
 * confirms on the confirmation screen. The signed `linkToken` (not raw ids)
 * authorizes exactly which client + Google user to link.
 */
async function confirmLink(req, res, next) {
  try {
    const { linkToken } = req.body || {};
    if (!linkToken) throw new ApiError(400, "Missing link token");

    const { user } = await accountLinking.confirmDeferredLink(linkToken);
    const accessToken = await issueTokens(user, res);
    return ApiResponse.ok(res, "Account linked", {
      accessToken,
      user: buildSafeUser(user),
    });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      throw new ApiError(401, "Unauthorized");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    } catch {
      throw new ApiError(401, "Unauthorized");
    }

    const user = await User.findById(decoded.userId).select("+refreshToken");
    if (!user || !user.isActive || user.refreshToken !== token) {
      throw new ApiError(401, "Unauthorized");
    }

    const accessToken = generateAccessToken(user._id, user.role);

    return ApiResponse.ok(res, "Token refreshed", { accessToken });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];

    if (token) {
      await User.findOneAndUpdate({ refreshToken: token }, { refreshToken: null });
    }

    res.clearCookie(REFRESH_COOKIE, COOKIE_OPTIONS);
    return ApiResponse.ok(res, "Logged out successfully");
  } catch (err) {
    next(err);
  }
}

async function createAdmin(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new ApiError(400, "Name, email and password are required");
    }

    // Normalize so the stored email always matches what adminLogin looks up.
    const normalizedEmail = String(email).toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      throw new ApiError(409, "Email already in use");
    }

    const hashed = await bcrypt.hash(password, 12);

    await User.create({
      name,
      email: normalizedEmail,
      password: hashed,
      role: "ADMIN",
      isActive: true,
    });

    return ApiResponse.created(res, "Admin created successfully");
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/invite/:token
 * Public — returns invite metadata so the activation page can render
 * a friendly "Welcome, <name>!" before activation.
 */
async function getInvite(req, res, next) {
  try {
    const invite = await ClientInvite.findOne({ inviteToken: req.params.token });
    if (!invite) throw new ApiError(404, "Invitation not found");
    if (invite.expiresAt < new Date()) throw new ApiError(410, "Invitation has expired");

    return ApiResponse.ok(res, "Invite", {
      invite: {
        clientName: invite.clientName,
        email:      invite.email,
        expiresAt:  invite.expiresAt,
        used:       invite.isUsed,
      },
    });
  } catch (err) { next(err); }
}

/**
 * POST /api/auth/invite/:token/activate
 * Public — creates (or reuses) a CLIENT User linked to the invited Client,
 * issues tokens, and returns them. Idempotent: if the User already exists
 * (re-clicking the activation link) we just log them in.
 *
 * Clients never get a password: after this first session they sign back in
 * with Google using the same email (the Google strategy links by email).
 *
 * Body: { name? } — optional display-name override.
 */
async function activateInvite(req, res, next) {
  try {
    const invite = await ClientInvite.findOne({ inviteToken: req.params.token });
    if (!invite) throw new ApiError(404, "Invitation not found");
    if (invite.expiresAt < new Date()) throw new ApiError(410, "Invitation has expired");

    // Prefer the unambiguous clientId reference. Fall back to the legacy
    // name match only for invites minted before clientId was recorded.
    let client = null;
    if (invite.clientId) {
      client = await Client.findById(invite.clientId);
    }
    if (!client) {
      client = await Client.findOne({ trainerId: invite.trainerId, name: invite.clientName });
    }
    if (!client) throw new ApiError(404, "Linked client record was not found");

    let user;
    if (client.userId) {
      // Already activated — just sign them in.
      user = await User.findById(client.userId);
      if (!user) throw new ApiError(500, "Client account record missing");
    } else {
      // First-time activation. An optional display name may be supplied;
      // no password is created — clients authenticate via Google.
      const result = validateActivationPayload(req.body);
      if (!result.ok) {
        throw ApiError.validation(result.errors);
      }
      const { name: providedName } = result.value;

      // A real email is mandatory: clients sign in with Google and are
      // matched by email. A synthetic placeholder address could never match
      // a Google account, permanently locking the client out — so reject
      // the activation and surface a clear, actionable error instead.
      if (!invite.email) {
        throw new ApiError(
          400,
          "This invite has no email on file. Ask your trainer to re-send it with your Google email address."
        );
      }
      const email = invite.email.toLowerCase();
      const existing = await User.findOne({ email });
      if (existing) {
        user = existing;
      } else {
        user = await User.create({
          name:     providedName || invite.clientName,
          email,
          role:     "CLIENT",
          isActive: true,
        });
      }
      client.userId = user._id;
      client.googleLinked = false;
      client.status = "ACTIVE";
      await client.save();

      // Only record the activation event on a first-time activation;
      // returning users re-hitting the link shouldn't spam the feed.
      await activityService.record({
        trainerId: invite.trainerId,
        clientId:  client._id,
        actorId:   user._id,
        actorRole: "CLIENT",
        type:      "INVITE_ACTIVATED",
        entityId:  client._id,
        summary:   `${client.name} activated their account`,
      });
    }

    // Single-use semantic is optional for prototype — mark used but keep
    // the link valid until expiry so the client can re-enter.
    invite.isUsed = true;
    await invite.save();

    const accessToken = await issueTokens(user, res);
    return ApiResponse.ok(res, "Account activated", {
      accessToken,
      user: buildSafeUser(user),
    });
  } catch (err) { next(err); }
}

function getCurrentUser(req, res) {
  const { _id, name, email, role, isActive, profileImage, googleLinked, createdAt, updatedAt } = req.user;
  return res.status(200).json({ success: true, user: { _id, name, email, role, isActive, profileImage, googleLinked, createdAt, updatedAt } });
}

module.exports = {
  adminLogin,
  login,
  googleCallback,
  confirmLink,
  refresh,
  logout,
  createAdmin,
  getCurrentUser,
  getInvite,
  activateInvite,
};
