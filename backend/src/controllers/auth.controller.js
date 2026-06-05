"use strict";

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../schemas/User.schema");
const generateAccessToken = require("../utils/generateAccessToken");
const generateRefreshToken = require("../utils/generateRefreshToken");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const { env } = require("../config/env");

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

async function googleCallback(req, res, next) {
  try {
    if (!req.user) {
      throw new ApiError(401, "Google authentication failed");
    }

    const accessToken = await issueTokens(req.user, res);

    return ApiResponse.ok(res, "Login successful", { accessToken, user: buildSafeUser(req.user) });
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

function getCurrentUser(req, res) {
  const { _id, name, email, role, isActive, profileImage, createdAt, updatedAt } = req.user;
  return res.status(200).json({ success: true, user: { _id, name, email, role, isActive, profileImage, createdAt, updatedAt } });
}

module.exports = { adminLogin, googleCallback, refresh, logout, createAdmin, getCurrentUser };
