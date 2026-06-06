import api from "../lib/api";

async function list({ limit = 20 } = {}) {
  const res = await api.get("/activity", { params: { limit } });
  return res.data?.data?.activities ?? [];
}

const activityService = { list };
export default activityService;
