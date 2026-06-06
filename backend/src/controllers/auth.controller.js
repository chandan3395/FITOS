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

const REFRESH_COOKIE = "refreshToken";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
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

    const user = await User.findOne({ email, role: "ADMIN" }).select("+password");
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
 * Google OAuth callback handler.
 *
 * After Passport verifies the Google profile we issue our own JWT pair
 * and redirect the browser to a frontend page (`/auth/google/callback`)
 * with the access token in the URL fragment. The refresh token is already
 * set as an HttpOnly cookie by `issueTokens`. The fragment never leaves
 * the browser, so the access token is not logged server-side.
 */
async function googleCallback(req, res, _next) {
  try {
    if (!req.user) {
      throw new ApiError(401, "Google authentication failed");
    }

    const accessToken = await issueTokens(req.user, res);
    const params = new URLSearchParams({
      token: accessToken,
      role:  req.user.role,
    });
    return res.redirect(`${env.CLIENT_ORIGIN}/auth/google/callback#${params.toString()}`);
  } catch (err) {
    // On failure, send the user back to the login page with an error flag.
    return res.redirect(`${env.CLIENT_ORIGIN}/login?error=google_failed`);
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

/**
 * POST /api/auth/trainer/login
 * Email + password login for the TRAINER role.
 */
async function trainerLogin(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    const user = await User.findOne({ email, role: "TRAINER" }).select("+password");
    if (!user || !user.password) {
      throw new ApiError(401, "Invalid credentials");
    }
    if (!user.isActive) {
      throw new ApiError(403, "Account disabled — contact your platform admin");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new ApiError(401, "Invalid credentials");
    }

    const accessToken = await issueTokens(user, res);
    return ApiResponse.ok(res, "Login successful", {
      accessToken,
      user: buildSafeUser(user),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/trainer/signup
 * Open self-signup for TRAINER role with email + password.
 * Issues the same access + refresh token pair as login so the
 * new trainer is logged in immediately.
 *
 * Trainers may still also sign up via Google OAuth; this is an
 * additional path that does not change the OAuth flow.
 */
async function trainerSignup(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new ApiError(400, "Name, email and password are required");
    }
    if (password.length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters");
    }

    const existing = await User.findOne({ email });
    if (existing) {
      throw new ApiError(409, "Email already in use");
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: "TRAINER",
      isActive: true,
    });

    const accessToken = await issueTokens(user, res);
    return ApiResponse.created(res, "Trainer account created", {
      accessToken,
      user: buildSafeUser(user),
    });
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

    const existing = await User.findOne({ email });
    if (existing) {
      throw new ApiError(409, "Email already in use");
    }

    const hashed = await bcrypt.hash(password, 12);

    await User.create({
      name,
      email,
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
 * Body: { name?, password? } — both optional. If no password is set the
 * client can still log back in by clicking the same activation link until
 * it expires, or via Google OAuth using the same email.
 */
async function activateInvite(req, res, next) {
  try {
    const invite = await ClientInvite.findOne({ inviteToken: req.params.token });
    if (!invite) throw new ApiError(404, "Invitation not found");
    if (invite.expiresAt < new Date()) throw new ApiError(410, "Invitation has expired");

    const client = await Client.findOne({ trainerId: invite.trainerId, name: invite.clientName });
    if (!client) throw new ApiError(404, "Linked client record was not found");

    let user;
    if (client.userId) {
      // Already activated — just sign them in. Password not re-required
      // because the existing user already has credentials on file.
      user = await User.findById(client.userId);
      if (!user) throw new ApiError(500, "Client account record missing");
    } else {
      // First-time activation — password is REQUIRED and validated here.
      const result = validateActivationPayload(req.body);
      if (!result.ok) {
        throw ApiError.validation(result.errors);
      }
      const { name: providedName, password } = result.value;

      const email = (invite.email || `${invite.inviteToken.slice(0, 12)}@invite.fitos.local`).toLowerCase();
      const existing = await User.findOne({ email });
      if (existing) {
        user = existing;
      } else {
        const hashed = await bcrypt.hash(password, 12);
        user = await User.create({
          name:     providedName || invite.clientName,
          email,
          password: hashed,
          role:     "CLIENT",
          isActive: true,
        });
      }
      client.userId = user._id;
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
  const { _id, name, email, role, isActive, profileImage, createdAt, updatedAt } = req.user;
  return res.status(200).json({ success: true, user: { _id, name, email, role, isActive, profileImage, createdAt, updatedAt } });
}

module.exports = {
  adminLogin,
  trainerLogin,
  trainerSignup,
  googleCallback,
  refresh,
  logout,
  createAdmin,
  getCurrentUser,
  getInvite,
  activateInvite,
};
