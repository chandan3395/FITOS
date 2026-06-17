import api from "../lib/api";
import uploadService from "./uploadService";

/**
 * Nutrition v2 meal-log client API.
 *
 * CRITICAL: callers pass the client's LOCAL date + weekday so a client near
 * midnight sees the correct day (the backend accepts ?date / ?weekday and
 * otherwise falls back to server UTC).
 */

/** GET the nutrition "today" summary { weekday, date, planId, mealsPerDay, waterTarget, target, consumed, meals[] }. */
async function today({ date, weekday } = {}) {
  const res = await api.get("/meal-logs/today", { params: { date, weekday } });
  return res.data?.data?.summary ?? null;
}

/** GET the signed-in client's own meal logs (optionally for one local date). */
async function listMine({ date } = {}) {
  const res = await api.get("/meal-logs/me", { params: { date } });
  return res.data?.data?.mealLogs ?? [];
}

/**
 * Log/upload one meal: compress + signed direct Cloudinary upload (reusing the
 * progress-photo pattern), then persist metadata. The backend snapshots the
 * planned macros for this weekday/mealType and resets the entry to "pending".
 * clientId is omitted on the client path — the backend resolves the caller.
 */
async function log({ date, mealType, file }) {
  const meta = await uploadService.uploadMealLog({ date, mealType, file });
  const res = await api.post("/meal-logs", { date, mealType, publicId: meta.publicId });
  return res.data?.data?.mealLog ?? null;
}

const mealLogService = { today, listMine, log };
export default mealLogService;
