"use strict";

const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

function generateToken(userId, role) {
  return jwt.sign({ userId, role }, env.JWT_SECRET, { expiresIn: "7d" });
}

module.exports = generateToken;
