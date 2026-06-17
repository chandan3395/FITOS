import api from "../lib/api";
import { serializeSchedule } from "./../lib/nutritionTotals";

async function listForClient(clientId, params = {}) {
  const res = await api.get(`/nutrition/client/${clientId}`, { params });
  return res.data?.data?.nutritionPlans ?? [];
}

async function listMine() {
  const res = await api.get("/nutrition/client/me");
  return res.data?.data?.nutritionPlans ?? [];
}

async function create(clientId, payload) {
  const res = await api.post(`/nutrition/client/${clientId}`, payload);
  return res.data?.data?.nutritionPlan ?? null;
}

async function update(id, payload) {
  const res = await api.patch(`/nutrition/${id}`, payload);
  return res.data?.data?.nutritionPlan ?? null;
}

async function publish(id) {
  const res = await api.post(`/nutrition/${id}/publish`);
  return res.data?.data?.nutritionPlan ?? null;
}

async function archive(id) {
  const res = await api.post(`/nutrition/${id}/archive`);
  return res.data?.data?.nutritionPlan ?? null;
}

async function remove(id) {
  const res = await api.delete(`/nutrition/${id}`);
  return res.data?.data ?? null;
}

async function reassign(id, clientId) {
  const res = await api.post(`/nutrition/${id}/reassign`, { clientId });
  return res.data?.data?.nutritionPlan ?? null;
}

async function duplicate(clientId, plan) {
  const payload = {
    planName: `${plan.planName} Copy`,
    notes: plan.notes,
    status: "DRAFT",
    calories: plan.calories,
    protein: plan.protein,
    carbs: plan.carbs,
    fats: plan.fats,
    waterTarget: plan.waterTarget,
    mealsPerDay: plan.mealsPerDay,
    cheatMeals: plan.cheatMeals,
    dietType: plan.dietType,
    foodAvoidances: plan.foodAvoidances,
    eatingHabits: plan.eatingHabits,
    schedule: serializeSchedule(plan.schedule),
  };
  return create(clientId, payload);
}

const nutritionService = {
  listForClient,
  listMine,
  create,
  update,
  publish,
  archive,
  remove,
  reassign,
  duplicate,
};

export default nutritionService;
