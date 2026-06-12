"use strict";

const activityService = require("../services/activity.service");
const ApiResponse = require("../utils/ApiResponse");

async function list(req, res, next) {
  try {
    const items = await activityService.listForUser(req.user, {
      limit:     req.query.limit,
      trainerId: req.query.trainerId,
    });
    return ApiResponse.ok(res, "Activity feed", { activities: items });
  } catch (err) { return next(err); }
}

async function listMine(req, res, next) {
  try {
    const items = await activityService.listForClientUser(req.user, {
      limit: req.query.limit,
    });
    return ApiResponse.ok(res, "Activity feed", { activities: items });
  } catch (err) { return next(err); }
}

module.exports = { list, listMine };
