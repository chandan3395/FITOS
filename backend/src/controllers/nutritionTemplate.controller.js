"use strict";

const service = require("../services/nutritionTemplate.service");
const ApiResponse = require("../utils/ApiResponse");

const list = async (req, res, next) => {
  try { return ApiResponse.ok(res, "Nutrition templates", { templates: await service.listForUser(req.user, req.query) }); }
  catch (e) { next(e); }
};
const getOne = async (req, res, next) => {
  try { return ApiResponse.ok(res, "Nutrition template", { template: await service.getById(req.user, req.params.id) }); }
  catch (e) { next(e); }
};
const create = async (req, res, next) => {
  try { return ApiResponse.created(res, "Nutrition template created", { template: await service.create(req.user, req.body) }); }
  catch (e) { next(e); }
};
const update = async (req, res, next) => {
  try { return ApiResponse.ok(res, "Nutrition template updated", { template: await service.update(req.user, req.params.id, req.body) }); }
  catch (e) { next(e); }
};
const archive = async (req, res, next) => {
  try { return ApiResponse.ok(res, "Nutrition template archived", { template: await service.archive(req.user, req.params.id) }); }
  catch (e) { next(e); }
};
const remove = async (req, res, next) => {
  try { return ApiResponse.ok(res, "Nutrition template deleted", await service.remove(req.user, req.params.id)); }
  catch (e) { next(e); }
};
const duplicate = async (req, res, next) => {
  try { return ApiResponse.created(res, "Nutrition template duplicated", { template: await service.duplicate(req.user, req.params.id) }); }
  catch (e) { next(e); }
};
const assign = async (req, res, next) => {
  try {
    const clientId = req.body?.clientId;
    if (!clientId) {
      return ApiResponse.send(res, 400, "Target clientId is required", { errors: { clientId: "Required." } });
    }
    const nutritionPlan = await service.assignToClient(req.user, req.params.id, clientId);
    return ApiResponse.created(res, "Template assigned", { nutritionPlan });
  } catch (e) { next(e); }
};

module.exports = { list, getOne, create, update, archive, remove, duplicate, assign };
