"use strict";

const {
  createNutritionPlan,
  listNutritionPlansForClient,
  listNutritionPlansForCurrentClient,
  getNutritionPlanById,
  updateNutritionPlan,
  publishNutritionPlan,
  archiveNutritionPlan,
  deleteNutritionPlan,
  reassignNutritionPlan,
} = require("../services/nutritionPlan.service");
const ApiResponse = require("../utils/ApiResponse");

async function createHandler(req, res, next) {
  try {
    const nutritionPlan = await createNutritionPlan(req.user, req.params.clientId, req.body);
    return ApiResponse.created(res, "Nutrition plan created", { nutritionPlan });
  } catch (err) { return next(err); }
}

async function listForClientHandler(req, res, next) {
  try {
    const nutritionPlans = await listNutritionPlansForClient(req.user, req.params.clientId, req.query);
    return ApiResponse.ok(res, "Nutrition plans retrieved", { nutritionPlans });
  } catch (err) { return next(err); }
}

async function listForCurrentClientHandler(req, res, next) {
  try {
    const nutritionPlans = await listNutritionPlansForCurrentClient(req.user);
    return ApiResponse.ok(res, "Nutrition plans retrieved", { nutritionPlans });
  } catch (err) { return next(err); }
}

async function getHandler(req, res, next) {
  try {
    const nutritionPlan = await getNutritionPlanById(req.user, req.params.id);
    return ApiResponse.ok(res, "Nutrition plan retrieved", { nutritionPlan });
  } catch (err) { return next(err); }
}

async function updateHandler(req, res, next) {
  try {
    const nutritionPlan = await updateNutritionPlan(req.user, req.params.id, req.body);
    return ApiResponse.ok(res, "Nutrition plan updated", { nutritionPlan });
  } catch (err) { return next(err); }
}

async function publishHandler(req, res, next) {
  try {
    const nutritionPlan = await publishNutritionPlan(req.user, req.params.id);
    return ApiResponse.ok(res, "Nutrition plan published", { nutritionPlan });
  } catch (err) { return next(err); }
}

async function archiveHandler(req, res, next) {
  try {
    const nutritionPlan = await archiveNutritionPlan(req.user, req.params.id);
    return ApiResponse.ok(res, "Nutrition plan archived", { nutritionPlan });
  } catch (err) { return next(err); }
}

async function deleteHandler(req, res, next) {
  try {
    const result = await deleteNutritionPlan(req.user, req.params.id);
    return ApiResponse.ok(res, "Nutrition plan deleted", result);
  } catch (err) { return next(err); }
}

async function reassignHandler(req, res, next) {
  try {
    const targetClientId = req.body?.clientId;
    if (!targetClientId) {
      return ApiResponse.send(res, 400, "Target clientId is required", { errors: { clientId: "Required." } });
    }
    const nutritionPlan = await reassignNutritionPlan(req.user, req.params.id, targetClientId);
    return ApiResponse.created(res, "Nutrition plan reassigned", { nutritionPlan });
  } catch (err) { return next(err); }
}

module.exports = {
  createHandler,
  listForClientHandler,
  listForCurrentClientHandler,
  getHandler,
  updateHandler,
  publishHandler,
  archiveHandler,
  deleteHandler,
  reassignHandler,
};
