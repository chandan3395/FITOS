import api from "../lib/api";

async function listTrainers() {
  const res = await api.get("/admin/trainers");
  return res.data?.data?.trainers ?? [];
}

async function createTrainer(payload) {
  const res = await api.post("/admin/trainers", payload);
  return res.data?.data?.trainer ?? null;
}

async function disableTrainer(id) {
  const res = await api.post(`/admin/trainers/${id}/disable`);
  return res.data?.data?.trainer ?? null;
}

async function enableTrainer(id) {
  const res = await api.post(`/admin/trainers/${id}/enable`);
  return res.data?.data?.trainer ?? null;
}

async function getPlatformMetrics() {
  const res = await api.get("/admin/metrics");
  return res.data?.data?.metrics ?? null;
}

const adminService = {
  listTrainers,
  createTrainer,
  disableTrainer,
  enableTrainer,
  getPlatformMetrics,
};

export default adminService;
