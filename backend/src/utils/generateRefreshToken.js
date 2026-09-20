"use strict";

const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

function generateRefreshToken(userId, sessionVersion = 0) {
  return jwt.sign({ userId, sv: sessionVersion }, env.JWT_REFRESH_SECRET, { expiresIn: "7d", jwtid: require("crypto").randomUUID() });
}

module.exports = generateRefreshToken;
