import api from "../lib/api";

async function list(params = {}) {
  const res = await api.get("/workout-templates", { params });
  return res.data?.data?.templates ?? [];
}
async function getById(id) {
  const res = await api.get(`/workout-templates/${id}`);
  return res.data?.data?.template ?? null;
}
async function create(payload) {
  const res = await api.post("/workout-templates", payload);
  return res.data?.data?.template ?? null;
}
async function update(id, payload) {
  const res = await api.patch(`/workout-templates/${id}`, payload);
  return res.data?.data?.template ?? null;
}
async function archive(id) {
  const res = await api.post(`/workout-templates/${id}/archive`);
  return res.data?.data?.template ?? null;
}
async function remove(id) {
  const res = await api.delete(`/workout-templates/${id}`);
  return res.data?.data ?? null;
}
async function duplicate(id) {
  const res = await api.post(`/workout-templates/${id}/duplicate`);
  return res.data?.data?.template ?? null;
}

/** Snapshot this template into a new DRAFT workout plan for the client. */
async function assign(id, clientId) {
  const res = await api.post(`/workout-templates/${id}/assign`, { clientId });
  return res.data?.data?.workoutPlan ?? null;
}

const workoutTemplateService = { list, getById, create, update, archive, remove, duplicate, assign };
export default workoutTemplateService;
