import api from "../lib/api";
import uploadService from "./uploadService";

const MEALS = ["breakfast", "lunch", "dinner", "snack"];

/** TRAINER / ADMIN — a client's check-ins, newest day first. */
async function listForClient(clientId) {
  const res = await api.get(`/meal-checkins/client/${clientId}`);
  return res.data?.data?.mealCheckins ?? [];
}

/** CLIENT — own check-ins, newest day first. */
async function listMine() {
  const res = await api.get("/meal-checkins/me");
  return res.data?.data?.mealCheckins ?? [];
}

/**
 * Upload a day's meal photos. Each provided meal is compressed + uploaded
 * directly to Cloudinary (signed); only metadata is posted to our backend.
 * `clientId` is sent only on the trainer/admin path — the client portal omits
 * it and the backend resolves the caller's own Client.
 */
async function upload({ clientId, date, note, breakfast, lunch, dinner, snack }) {
  const files = { breakfast, lunch, dinner, snack };
  const metas = await Promise.all(
    MEALS.map((meal) => uploadService.uploadMealSlot({ clientId, date, meal, file: files[meal] }))
  );

  const body = { date };
  if (clientId) body.clientId = clientId;
  if (note != null && note !== "") body.note = note;
  MEALS.forEach((meal, i) => { if (metas[i]) body[meal] = metas[i]; });

  const res = await api.post("/meal-checkins", body);
  return res.data?.data?.mealCheckin ?? null;
}

async function comment(id, comment) {
  const res = await api.patch(`/meal-checkins/${id}/comment`, { comment });
  return res.data?.data?.mealCheckin ?? null;
}

/** Trainer approves (REVIEWED) or flags (FLAGGED) a check-in. */
async function setStatus(id, status) {
  const res = await api.patch(`/meal-checkins/${id}/status`, { status });
  return res.data?.data?.mealCheckin ?? null;
}

async function remove(id) {
  const res = await api.delete(`/meal-checkins/${id}`);
  return res.data?.data ?? null;
}

const mealCheckinService = { listForClient, listMine, upload, comment, setStatus, remove, MEALS };
export default mealCheckinService;
