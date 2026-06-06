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

// ─── Admin management ───────────────────────────────────────
async function listAdmins() {
  const res = await api.get("/admin/admins");
  return res.data?.data?.admins ?? [];
}

async function createAdmin(payload) {
  const res = await api.post("/admin/admins", payload);
  return res.data?.data?.admin ?? null;
}

async function disableAdmin(id) {
  const res = await api.post(`/admin/admins/${id}/disable`);
  return res.data?.data?.admin ?? null;
}

async function enableAdmin(id) {
  const res = await api.post(`/admin/admins/${id}/enable`);
  return res.data?.data?.admin ?? null;
}

async function deleteAdmin(id) {
  const res = await api.delete(`/admin/admins/${id}`);
  return res.data?.data ?? null;
}

const adminService = {
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

export default adminService;
