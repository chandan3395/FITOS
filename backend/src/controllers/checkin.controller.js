"use strict";

const checkinService = require("../services/checkin.service");
const ApiResponse = require("../utils/ApiResponse");

async function create(req, res, next) {
  try {
    const doc = await checkinService.create(req.user, req.body);
    return ApiResponse.created(res, "Check-in created", { checkin: doc });
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const docs = await checkinService.list(req.user, {
      status:   req.query.status,
      clientId: req.query.clientId,
      limit:    Number(req.query.limit) || undefined,
    });
    return ApiResponse.ok(res, "Check-ins fetched", { checkins: docs });
  } catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try {
    const doc = await checkinService.getById(req.params.id, req.user);
    return ApiResponse.ok(res, "Check-in fetched", { checkin: doc });
  } catch (e) { next(e); }
}

async function review(req, res, next) {
  try {
    const doc = await checkinService.review(req.params.id, req.user, req.body);
    return ApiResponse.ok(res, "Check-in reviewed", { checkin: doc });
  } catch (e) { next(e); }
}

module.exports = { create, list, getOne, review };
