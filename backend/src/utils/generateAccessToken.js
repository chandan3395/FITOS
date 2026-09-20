"use strict";

const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

function generateAccessToken(userId, role, sessionVersion = 0) {
  return jwt.sign({ userId, role, sv: sessionVersion }, env.JWT_SECRET, { expiresIn: "10m" });
}

module.exports = generateAccessToken;
