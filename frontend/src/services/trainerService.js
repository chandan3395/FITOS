import api from "../lib/api";

/** GET /api/trainer/metrics — dashboard counts for the authenticated trainer */
async function getMetrics() {
  const res = await api.get("/trainer/metrics");
  return res.data?.data?.metrics ?? null;
}

const trainerService = { getMetrics };

export default trainerService;
