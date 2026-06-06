"use strict";

const service = require("../services/workoutTemplate.service");
const ApiResponse = require("../utils/ApiResponse");

const list = async (req, res, next) => {
  try { return ApiResponse.ok(res, "Workout templates", { templates: await service.listForUser(req.user, req.query) }); }
  catch (e) { next(e); }
};
const getOne = async (req, res, next) => {
  try { return ApiResponse.ok(res, "Workout template", { template: await service.getById(req.user, req.params.id) }); }
  catch (e) { next(e); }
};
const create = async (req, res, next) => {
  try { return ApiResponse.created(res, "Workout template created", { template: await service.create(req.user, req.body) }); }
  catch (e) { next(e); }
};
const update = async (req, res, next) => {
  try { return ApiResponse.ok(res, "Workout template updated", { template: await service.update(req.user, req.params.id, req.body) }); }
  catch (e) { next(e); }
};
const archive = async (req, res, next) => {
  try { return ApiResponse.ok(res, "Workout template archived", { template: await service.archive(req.user, req.params.id) }); }
  catch (e) { next(e); }
};
const remove = async (req, res, next) => {
  try { return ApiResponse.ok(res, "Workout template deleted", await service.remove(req.user, req.params.id)); }
  catch (e) { next(e); }
};
const duplicate = async (req, res, next) => {
  try { return ApiResponse.created(res, "Workout template duplicated", { template: await service.duplicate(req.user, req.params.id) }); }
  catch (e) { next(e); }
};
const assign = async (req, res, next) => {
  try {
    const clientId = req.body?.clientId;
    if (!clientId) {
      return ApiResponse.send(res, 400, "Target clientId is required", { errors: { clientId: "Required." } });
    }
    const workoutPlan = await service.assignToClient(req.user, req.params.id, clientId);
    return ApiResponse.created(res, "Template assigned", { workoutPlan });
  } catch (e) { next(e); }
};

module.exports = { list, getOne, create, update, archive, remove, duplicate, assign };
