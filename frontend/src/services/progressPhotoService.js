import api from "../lib/api";

async function listForClient(clientId) {
  const res = await api.get(`/progress-photos/client/${clientId}`);
  return res.data?.data?.photos ?? [];
}

/** CLIENT role — own photo sets newest week first. */
async function listMine() {
  const res = await api.get("/progress-photos/me");
  return res.data?.data?.photos ?? [];
}

async function upload({ clientId, weekNumber, front, side, back }) {
  const fd = new FormData();
  // clientId is only sent for trainer/admin path. Client portal omits it
  // and the backend resolves the caller's own Client from auth.
  if (clientId) fd.append("clientId", clientId);
  fd.append("weekNumber", weekNumber);
  if (front) fd.append("front", front);
  if (side)  fd.append("side",  side);
  if (back)  fd.append("back",  back);
  const res = await api.post("/progress-photos", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data?.data?.photo ?? null;
}

async function comment(id, comment) {
  const res = await api.patch(`/progress-photos/${id}/comment`, { comment });
  return res.data?.data?.photo ?? null;
}

/** Trainer marks a set as REVIEWED or FLAGGED (no comment required). */
async function setStatus(id, status) {
  const res = await api.patch(`/progress-photos/${id}/status`, { status });
  return res.data?.data?.photo ?? null;
}

/** Hard-delete the record and its underlying files. */
async function remove(id) {
  const res = await api.delete(`/progress-photos/${id}`);
  return res.data?.data ?? null;
}

const progressPhotoService = { listForClient, listMine, upload, comment, setStatus, remove };
export default progressPhotoService;
