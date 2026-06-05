import api from "../lib/api";

async function listForClient(clientId) {
  const res = await api.get(`/progress-photos/client/${clientId}`);
  return res.data?.data?.photos ?? [];
}

async function upload({ clientId, weekNumber, front, side, back }) {
  const fd = new FormData();
  fd.append("clientId",   clientId);
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

const progressPhotoService = { listForClient, upload, comment };
export default progressPhotoService;
