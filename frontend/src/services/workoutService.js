import api from "../lib/api";

async function listForClient(clientId, params = {}) {
  const res = await api.get(`/workouts/client/${clientId}`, { params });
  return res.data?.data?.workoutPlans ?? [];
}

async function listMine() {
  const res = await api.get("/workouts/client/me");
  return res.data?.data?.workoutPlans ?? [];
}

async function create(clientId, payload) {
  const res = await api.post(`/workouts/client/${clientId}`, payload);
  return res.data?.data?.workoutPlan ?? null;
}

async function update(id, payload) {
  const res = await api.patch(`/workouts/${id}`, payload);
  return res.data?.data?.workoutPlan ?? null;
}

/** Move plan to ACTIVE (must have at least one exercise). */
async function publish(id) {
  const res = await api.post(`/workouts/${id}/publish`);
  return res.data?.data?.workoutPlan ?? null;
}

/** Move plan to ARCHIVED (soft hide). */
async function archive(id) {
  const res = await api.post(`/workouts/${id}/archive`);
  return res.data?.data?.workoutPlan ?? null;
}

/** Hard-delete the plan and its completion history. */
async function remove(id) {
  const res = await api.delete(`/workouts/${id}`);
  return res.data?.data ?? null;
}

/** Clone an existing plan to a different client (returns a new DRAFT plan). */
async function reassign(id, clientId) {
  const res = await api.post(`/workouts/${id}/reassign`, { clientId });
  return res.data?.data?.workoutPlan ?? null;
}

async function duplicate(clientId, plan) {
  const payload = {
    planName: `${plan.planName} Copy`,
    goal: plan.goal,
    durationWeeks: plan.durationWeeks,
    notes: plan.notes,
    status: "DRAFT",
    exercises: (plan.exercises || []).map(({ _id, ...exercise }) => exercise)
  };
  return create(clientId, payload);
}

async function completions(planId) {
  const res = await api.get(`/workouts/${planId}/completions`);
  return res.data?.data?.completions ?? [];
}

async function completeExercise(planId, exerciseId) {
  const res = await api.post(`/workouts/${planId}/exercises/${exerciseId}/complete`);
  return res.data?.data?.completion ?? null;
}

const workoutService = {
  listForClient,
  listMine,
  create,
  update,
  publish,
  archive,
  remove,
  reassign,
  duplicate,
  completions,
  completeExercise
};

export default workoutService;
