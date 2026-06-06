import api from "../lib/api";

async function list(params = {}) {
  const res = await api.get("/nutrition-templates", { params });
  return res.data?.data?.templates ?? [];
}
async function getById(id) {
  const res = await api.get(`/nutrition-templates/${id}`);
  return res.data?.data?.template ?? null;
}
async function create(payload) {
  const res = await api.post("/nutrition-templates", payload);
  return res.data?.data?.template ?? null;
}
async function update(id, payload) {
  const res = await api.patch(`/nutrition-templates/${id}`, payload);
  return res.data?.data?.template ?? null;
}
async function archive(id) {
  const res = await api.post(`/nutrition-templates/${id}/archive`);
  return res.data?.data?.template ?? null;
}
async function remove(id) {
  const res = await api.delete(`/nutrition-templates/${id}`);
  return res.data?.data ?? null;
}
async function duplicate(id) {
  const res = await api.post(`/nutrition-templates/${id}/duplicate`);
  return res.data?.data?.template ?? null;
}

/** Snapshot this template into a new DRAFT nutrition plan for the client. */
async function assign(id, clientId) {
  const res = await api.post(`/nutrition-templates/${id}/assign`, { clientId });
  return res.data?.data?.nutritionPlan ?? null;
}

const nutritionTemplateService = { list, getById, create, update, archive, remove, duplicate, assign };
export default nutritionTemplateService;
