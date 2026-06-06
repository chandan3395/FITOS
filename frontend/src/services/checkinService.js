import api from "../lib/api";

async function list({ status, clientId, limit } = {}) {
  const params = {};
  if (status)   params.status   = status;
  if (clientId) params.clientId = clientId;
  if (limit)    params.limit    = limit;
  const res = await api.get("/checkins", { params });
  return res.data?.data?.checkins ?? [];
}

/** CLIENT role — own check-in history newest first. */
async function listMine({ limit } = {}) {
  const res = await api.get("/checkins/me", { params: { limit } });
  return res.data?.data?.checkins ?? [];
}

async function create(payload) {
  const res = await api.post("/checkins", payload);
  return res.data?.data?.checkin ?? null;
}

async function review(id, { status, trainerComment }) {
  const res = await api.patch(`/checkins/${id}/review`, { status, trainerComment });
  return res.data?.data?.checkin ?? null;
}

const checkinService = { list, listMine, create, review };
export default checkinService;
