"use strict";

const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { User } = require("../schemas/User.schema");
const ApiError = require("../utils/ApiError");

async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new ApiError(401, "No token provided");
    }

    const token = header.slice(7);
    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw new ApiError(401, "Unauthorized");
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(new ApiError(401, "Invalid or expired token"));
  }
}

module.exports = authenticate;
