"use strict";

const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

function generateRefreshToken(userId) {
  return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

module.exports = generateRefreshToken;
