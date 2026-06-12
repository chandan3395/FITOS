import api from "../lib/api";

async function list({ limit = 20 } = {}) {
  const res = await api.get("/activity", { params: { limit } });
  return res.data?.data?.activities ?? [];
}

/** GET /api/activity/me — the signed-in client's own Recent Activity feed. */
async function listMine({ limit = 20 } = {}) {
  const res = await api.get("/activity/me", { params: { limit } });
  return res.data?.data?.activities ?? [];
}

const activityService = { list, listMine };
export default activityService;
