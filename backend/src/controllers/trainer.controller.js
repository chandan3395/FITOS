"use strict";

const { Client } = require("../schemas/Client.schema");
const ApiResponse = require("../utils/ApiResponse");

/**
 * GET /api/trainer/metrics
 * Dashboard counts for the authenticated trainer.
 * For now only `activeClients` is real — the other three return 0
 * until check-ins / progress photos / attention rules land.
 */
async function getMetrics(req, res, next) {
  try {
    const trainerId = req.user._id;

    const [activeClients, totalClients, archivedClients] = await Promise.all([
      Client.countDocuments({ trainerId, status: "ACTIVE" }),
      Client.countDocuments({ trainerId }),
      Client.countDocuments({ trainerId, status: "ARCHIVED" }),
    ]);

    const metrics = {
      activeClients,
      totalClients,
      archivedClients,
      pendingCheckins:       0, // populated when CheckIn model lands
      photosPendingReview:   0, // populated when ProgressPhoto model lands
      attentionRequired:     0, // derived later from missed check-ins
    };

    return ApiResponse.ok(res, "Metrics fetched", { metrics });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMetrics };
