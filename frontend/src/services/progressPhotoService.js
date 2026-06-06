import api from "../lib/api";
import uploadService from "./uploadService";

async function listForClient(clientId) {
  const res = await api.get(`/progress-photos/client/${clientId}`);
  return res.data?.data?.photos ?? [];
}

/** CLIENT role — own photo sets newest week first. */
async function listMine() {
  const res = await api.get("/progress-photos/me");
  return res.data?.data?.photos ?? [];
}

/**
 * Upload a weekly photo set. Each provided slot is compressed and uploaded
 * directly to Cloudinary (signed); only the resulting metadata is posted to
 * our backend. clientId is sent only on the trainer/admin path — the client
 * portal omits it and the backend resolves the caller's own Client.
 */
async function upload({ clientId, weekNumber, front, side, back }) {
  const [frontMeta, sideMeta, backMeta] = await Promise.all([
    uploadService.uploadSlot({ clientId, weekNumber, slot: "front", file: front }),
    uploadService.uploadSlot({ clientId, weekNumber, slot: "side",  file: side }),
    uploadService.uploadSlot({ clientId, weekNumber, slot: "back",  file: back }),
  ]);

  const body = { weekNumber };
  if (clientId) body.clientId = clientId;
  if (frontMeta) body.front = frontMeta;
  if (sideMeta)  body.side  = sideMeta;
  if (backMeta)  body.back  = backMeta;

  const res = await api.post("/progress-photos", body);
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
