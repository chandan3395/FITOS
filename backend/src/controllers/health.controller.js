"use strict";

const mongoose = require("mongoose");

// DB-aware health check: Render (and any uptime probe) treats non-2xx as
// unhealthy, so a dead Mongo connection surfaces as 503 instead of a
// green "ok" while every real endpoint fails.
const getHealth = (_req, res) => {
  if (mongoose.connection.readyState === 1) {
    return res.status(200).json({ status: "ok", db: "connected" });
  }
  return res.status(503).json({ status: "degraded", db: "disconnected" });
};

module.exports = { getHealth };
