"use strict";

const mealCheckinService = require("../services/mealCheckin.service");
const ApiResponse = require("../utils/ApiResponse");

async function create(req, res, next) {
  try {
    // Bytes are uploaded to Cloudinary by the browser; the body carries only
    // metadata (clientId/date + per-meal publicIds + optional note).
    const doc = await mealCheckinService.create(req.user, req.body);
    return ApiResponse.created(res, "Meal check-in saved", { mealCheckin: doc });
  } catch (e) { next(e); }
}

async function listForClient(req, res, next) {
  try {
    const docs = await mealCheckinService.listForClient(req.params.id, req.user);
    return ApiResponse.ok(res, "Meal check-ins fetched", { mealCheckins: docs });
  } catch (e) { next(e); }
}

async function listForCurrentClient(req, res, next) {
  try {
    const docs = await mealCheckinService.listForCurrentClient(req.user);
    return ApiResponse.ok(res, "Meal check-ins fetched", { mealCheckins: docs });
  } catch (e) { next(e); }
}

async function comment(req, res, next) {
  try {
    const doc = await mealCheckinService.comment(req.params.id, req.user, req.body);
    return ApiResponse.ok(res, "Comment saved", { mealCheckin: doc });
  } catch (e) { next(e); }
}

async function setStatus(req, res, next) {
  try {
    const doc = await mealCheckinService.setStatus(req.params.id, req.user, req.body);
    return ApiResponse.ok(res, "Status updated", { mealCheckin: doc });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const result = await mealCheckinService.remove(req.params.id, req.user);
    return ApiResponse.ok(res, "Meal check-in deleted", result);
  } catch (e) { next(e); }
}

module.exports = { create, listForClient, listForCurrentClient, comment, setStatus, remove };
