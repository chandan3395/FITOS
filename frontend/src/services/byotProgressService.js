import api from "../lib/api";
export const PROGRESS_EVENT = "byot:progress-saved";
const base = "/byot/progress";
export const getSummary = () => api.get(`${base}/summary`).then((r) => r.data.data);
export const getRecord = (date) => api.get(`${base}/records/${date}`).then((r) => r.data.data);
export const getHistory = (params) =>
  api.get(`${base}/records`, { params }).then((r) => r.data.data);
export async function write(path, body, key, method = "put") {
  const result = await api.request({
    url: `${base}${path}`,
    method,
    data: body,
    headers: { "Idempotency-Key": key },
  });
  window.dispatchEvent(new Event(PROGRESS_EVENT));
  return result.data.data;
}
export const upload = (id, file, onProgress) =>
  api
    .post(`${base}/uploads/${id}/content`, file, {
      timeout: 90000,
      headers: { "Content-Type": file.type },
      onUploadProgress: (event) =>
        onProgress(Math.round((event.loaded / (event.total || file.size)) * 100)),
    })
    .then((r) => r.data.data);
export const imageBlob = (date, slot, size, signal) =>
  api
    .get(`${base}/checkins/${date}/photos/${slot}/${size}`, { responseType: "blob", signal })
    .then((r) => r.data);
