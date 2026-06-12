import api from "../lib/api";

/** GET /api/clients — list clients owned by the authenticated trainer */
async function list() {
  const res = await api.get("/clients");
  return res.data?.data?.clients ?? [];
}

/** GET /api/clients/:id — single client (ownership enforced server-side) */
async function getById(id) {
  const res = await api.get(`/clients/${id}`);
  return res.data?.data?.client ?? null;
}

/** POST /api/clients — create a new client */
async function create(payload) {
  const res = await api.post("/clients", payload);
  return res.data?.data ?? null;
}

/** PATCH /api/clients/:id — update editable fields */
async function update(id, patch) {
  const res = await api.patch(`/clients/${id}`, patch);
  return res.data?.data?.client ?? null;
}

/** Convenience: archive a client (status → ARCHIVED) */
async function archive(id) {
  return update(id, { status: "ARCHIVED" });
}

/** DELETE /api/clients/:id — soft-delete a client (reversible server-side) */
async function remove(id) {
  const res = await api.delete(`/clients/${id}`);
  return res.data?.data ?? null;
}

/** POST /api/clients/:id/invite — (re)send the activation invite via WhatsApp */
async function sendInvite(id) {
  const res = await api.post(`/clients/${id}/invite`);
  return res.data?.data ?? null;
}

/** POST /api/clients/:id/invite/regenerate — invalidate old invite(s) + mint a fresh link */
async function regenerateInvite(id) {
  const res = await api.post(`/clients/${id}/invite/regenerate`);
  return res.data?.data ?? null;
}

const clientService = { list, getById, create, update, archive, remove, sendInvite, regenerateInvite };

export default clientService;
