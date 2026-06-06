"use strict";

const adminService = require("../services/admin.service");
const ApiResponse  = require("../utils/ApiResponse");

async function listTrainers(_req, res, next) {
  try {
    const trainers = await adminService.listTrainers();
    return ApiResponse.ok(res, "Trainers fetched", { trainers });
  } catch (e) { next(e); }
}

async function createTrainer(req, res, next) {
  try {
    const trainer = await adminService.createTrainer(req.body);
    return ApiResponse.created(res, "Trainer created", { trainer });
  } catch (e) { next(e); }
}

async function disableTrainer(req, res, next) {
  try {
    const trainer = await adminService.setTrainerActive(req.params.id, false);
    return ApiResponse.ok(res, "Trainer disabled", { trainer });
  } catch (e) { next(e); }
}

async function enableTrainer(req, res, next) {
  try {
    const trainer = await adminService.setTrainerActive(req.params.id, true);
    return ApiResponse.ok(res, "Trainer enabled", { trainer });
  } catch (e) { next(e); }
}

async function getPlatformMetrics(_req, res, next) {
  try {
    const metrics = await adminService.getPlatformMetrics();
    return ApiResponse.ok(res, "Platform metrics", { metrics });
  } catch (e) { next(e); }
}

module.exports = {
  listTrainers,
  createTrainer,
  disableTrainer,
  enableTrainer,
  getPlatformMetrics,
};
