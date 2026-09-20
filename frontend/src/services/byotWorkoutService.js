import api from "../lib/api";
const base = "/byot/workouts";
export const WORKOUT_EVENT = "byot:workout-saved";
export const readRoutine = () => api.get(`${base}/routine`).then((r) => r.data.data);
export const readDay = (date) =>
  api.get(`${base}/day`, { params: date ? { date } : {} }).then((r) => r.data.data);
export async function writeWorkout(path, body, key, method = "put") {
  const response = await api.request({
    method,
    url: `${base}${path}`,
    data: body,
    headers: { "Idempotency-Key": key },
  });
  window.dispatchEvent(new Event(WORKOUT_EVENT));
  return response.data.data;
}
