"use strict";

const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

function generateAccessToken(userId, role) {
  return jwt.sign({ userId, role }, env.JWT_SECRET, { expiresIn: "10m" });
}

module.exports = generateAccessToken;
