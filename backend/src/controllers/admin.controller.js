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

// ─── Admin management ──────────────────────────────────────────
async function listAdmins(_req, res, next) {
  try {
    const admins = await adminService.listAdmins();
    return ApiResponse.ok(res, "Admins fetched", { admins });
  } catch (e) { next(e); }
}

async function createAdmin(req, res, next) {
  try {
    const admin = await adminService.createAdmin(req.body);
    return ApiResponse.created(res, "Admin created", { admin });
  } catch (e) { next(e); }
}

async function disableAdmin(req, res, next) {
  try {
    const admin = await adminService.setAdminActive(req.user, req.params.id, false);
    return ApiResponse.ok(res, "Admin disabled", { admin });
  } catch (e) { next(e); }
}

async function enableAdmin(req, res, next) {
  try {
    const admin = await adminService.setAdminActive(req.user, req.params.id, true);
    return ApiResponse.ok(res, "Admin enabled", { admin });
  } catch (e) { next(e); }
}

async function deleteAdmin(req, res, next) {
  try {
    const result = await adminService.deleteAdmin(req.user, req.params.id);
    return ApiResponse.ok(res, "Admin deleted", result);
  } catch (e) { next(e); }
}

module.exports = {
  listTrainers,
  createTrainer,
  disableTrainer,
  enableTrainer,
  getPlatformMetrics,
  listAdmins,
  createAdmin,
  disableAdmin,
  enableAdmin,
  deleteAdmin,
};
