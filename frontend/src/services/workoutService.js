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

async function archive(id) {
  const res = await api.delete(`/workouts/${id}`);
  return res.data?.data?.workoutPlan ?? null;
}

async function duplicate(clientId, plan) {
  const payload = {
    planName: `${plan.planName} Copy`,
    goal: plan.goal,
    durationWeeks: plan.durationWeeks,
    notes: plan.notes,
    status: "ARCHIVED",
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
  archive,
  duplicate,
  completions,
  completeExercise
};

export default workoutService;
