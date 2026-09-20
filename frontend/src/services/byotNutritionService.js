import api from "../lib/api";
const root = "/byot/nutrition";
const unwrap = (response) => response.data.data;
async function write(path, body, key, method = "put") {
  const data = unwrap(
    await api.request({ url: root + path, method, data: body, headers: { "Idempotency-Key": key } })
  );
  window.dispatchEvent(new Event("byot:nutrition-saved"));
  return data;
}
export default {
  day: (date) => api.get(`${root}/day`, { params: date ? { date } : {} }).then(unwrap),
  summary: () => api.get(`${root}/summary`).then(unwrap),
  savePlan: (body, key) => write("/plan", body, key),
  saveLog: (date, body, key) => write(`/logs/${date}`, body, key),
};
