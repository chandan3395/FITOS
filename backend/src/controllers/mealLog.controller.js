"use strict";

const mealLogService = require("../services/mealLog.service");
const ApiResponse = require("../utils/ApiResponse");

async function create(req, res, next) {
  try {
    // Bytes are uploaded to Cloudinary by the browser (POST /uploads/sign-meal-log
    // first); the body carries only metadata (mealType + publicId + optional date).
    const mealLog = await mealLogService.create(req.user, req.body);
    return ApiResponse.created(res, "Meal logged", { mealLog });
  } catch (e) { next(e); }
}

async function listForCurrentClient(req, res, next) {
  try {
    const mealLogs = await mealLogService.listForCurrentClient(req.user, req.query);
    return ApiResponse.ok(res, "Meal logs fetched", { mealLogs });
  } catch (e) { next(e); }
}

async function today(req, res, next) {
  try {
    const summary = await mealLogService.getTodaySummary(req.user, req.query);
    return ApiResponse.ok(res, "Today summary", { summary });
  } catch (e) { next(e); }
}

async function listForClient(req, res, next) {
  try {
    const mealLogs = await mealLogService.listForClient(req.params.id, req.user);
    return ApiResponse.ok(res, "Meal logs fetched", { mealLogs });
  } catch (e) { next(e); }
}

async function review(req, res, next) {
  try {
    const mealLog = await mealLogService.review(req.user, req.params.id, req.params.entryId, req.body);
    return ApiResponse.ok(res, "Meal reviewed", { mealLog });
  } catch (e) { next(e); }
}

module.exports = { create, listForCurrentClient, today, listForClient, review };
