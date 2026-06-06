"use strict";

const { Client }        = require("../schemas/Client.schema");
const { CheckIn }       = require("../schemas/CheckIn.schema");
const { ProgressPhoto } = require("../schemas/ProgressPhoto.schema");
const ApiResponse = require("../utils/ApiResponse");

/**
 * GET /api/trainer/metrics
 * Real counts pulled from the trainer's own data.
 */
async function getMetrics(req, res, next) {
  try {
    const trainerId = req.user._id;
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);

    const [
      activeClients,
      totalClients,
      archivedClients,
      pendingCheckins,
      photosPendingReview,
    ] = await Promise.all([
      Client.countDocuments({ trainerId, status: "ACTIVE" }),
      Client.countDocuments({ trainerId }),
      Client.countDocuments({ trainerId, status: "ARCHIVED" }),
      CheckIn.countDocuments({ trainerId, status: "PENDING" }),
      ProgressPhoto.countDocuments({ trainerId, status: "PENDING" }),
    ]);

    // Attention required = active clients whose latest check-in is older
    // than 7 days (or who have no check-in at all).
    const activeIds = await Client.find(
      { trainerId, status: "ACTIVE" },
      { _id: 1 }
    ).lean();
    const recentCheckinClientIds = await CheckIn.distinct("clientId", {
      trainerId,
      createdAt: { $gte: sevenDaysAgo },
    });
    const recentSet = new Set(recentCheckinClientIds.map(String));
    const attentionRequired = activeIds.filter(
      (c) => !recentSet.has(String(c._id))
    ).length;

    return ApiResponse.ok(res, "Metrics fetched", {
      metrics: {
        activeClients,
        totalClients,
        archivedClients,
        pendingCheckins,
        photosPendingReview,
        attentionRequired,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMetrics };
