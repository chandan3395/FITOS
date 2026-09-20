"use strict";
const {
  ByotWorkoutRoutine: Routine,
  ByotDailyWorkout: Daily,
} = require("../schemas/ByotWorkout.schema");
const { ByotProfile } = require("../schemas/ByotProfile.schema");
const { localDate } = require("./byot.service");
const clock = require("../utils/byotClock");
const mutate = require("../utils/byotMutation");
const v = require("../validators/byotWorkout.validator");
const ApiError = require("../utils/ApiError");
async function context(ownerId, date) {
  const profile = await ByotProfile.findOne({ ownerId }).lean();
  if (!profile?.onboardingCompletedAt) throw new ApiError(409, "Complete BYOT onboarding first");
  const now = clock.now();
  const today = localDate(now, profile.timezone);
  date = date === undefined ? today : v.localDate(date);
  return { today, date, weekday: v.weekday(date), timezone: profile.timezone, now };
}
const exerciseView = (e) => ({
  id: e.id,
  name: e.name,
  sets: e.sets ?? null,
  reps: e.reps,
  weightKg: e.weightKg ?? null,
  restSeconds: e.restSeconds ?? null,
  notes: e.notes,
});
function routineView(routine) {
  return {
    exists: Boolean(routine && !routine.deleted),
    version: routine?.version || 0,
    name: routine?.name || "",
    days: (routine?.days || v.emptyDays()).map((d) => ({
      day: d.day,
      label: d.label,
      kind: d.kind,
      exercises: d.exercises.map(exerciseView),
    })),
  };
}
function dailyView(record, routine, ctx) {
  const day = routine?.days.find((d) => d.day === ctx.weekday);
  const preview = ctx.date === ctx.today && routine && !routine.deleted ? day : null;
  const source = record || preview;
  const exercises = (source?.exercises || []).map((e) => ({
    ...exerciseView(e),
    completed: record ? e.completed : false,
  }));
  const completedCount = exercises.filter((e) => e.completed).length;
  return {
    today: ctx.today,
    date: ctx.date,
    weekday: ctx.weekday,
    timezone: ctx.timezone,
    exists: Boolean(record),
    version: record?.version || 0,
    sourceRoutineVersion: record?.sourceRoutineVersion ?? routine?.version ?? 0,
    timezoneAtCreation: record?.timezoneAtCreation || null,
    startedAt: record?.startedAt || null,
    routineName: record?.routineName ?? (preview ? routine.name : ""),
    label: source?.label || "",
    kind: source?.kind || null,
    state: source
      ? source.kind === "workout" && !exercises.length
        ? "empty"
        : source.kind
      : ctx.date < ctx.today
        ? "not_recorded"
        : ctx.date > ctx.today
          ? "future"
          : "no_routine",
    exercises,
    completedCount,
    totalCount: exercises.length,
    percentage: exercises.length ? Math.round((completedCount / exercises.length) * 1000) / 10 : 0,
  };
}
async function getRoutine(ownerId) {
  await context(ownerId);
  return routineView(await Routine.findOne({ ownerId }).lean());
}
async function saveRoutine(ownerId, body, key, clear = false) {
  await context(ownerId);
  v.metadata(body, clear ? [] : ["name", "days"], key);
  const saved = await mutate(Routine, { ownerId }, body, key, clear ? "clear" : "save", (old) => ({
    name: clear ? "" : v.text(body.name, 100, "Routine name", true),
    days: clear ? v.emptyDays() : v.days(body.days, old?.days),
    deleted: clear,
  }));
  return routineView(saved);
}
async function readDay(ownerId, date) {
  const ctx = await context(ownerId, date);
  const [record, routine] = await Promise.all([
    Daily.findOne({ ownerId, date: ctx.date }).lean(),
    Routine.findOne({ ownerId }).lean(),
  ]);
  return dailyView(record, routine, ctx);
}
async function writeDay(ownerId, date, body, key, exerciseId) {
  const ctx = await context(ownerId, date);
  v.metadata(
    body,
    exerciseId === undefined ? ["routineVersion"] : ["routineVersion", "completed"],
    key
  );
  if (ctx.date > ctx.today) v.fail("Future workouts cannot be started or completed");
  if (
    body.routineVersion !== undefined &&
    (!Number.isSafeInteger(body.routineVersion) || body.routineVersion < 0)
  )
    v.fail("Invalid routine version");
  if (exerciseId !== undefined && (!v.UUID.test(exerciseId) || typeof body.completed !== "boolean"))
    v.fail("Use an exercise ID and an explicit boolean completed state");
  const record = await mutate(
    Daily,
    { ownerId, date: ctx.date },
    body,
    key,
    exerciseId === undefined ? "start" : `complete:${exerciseId}`,
    async (old) => {
      let snapshot = old;
      if (!old) {
        if (ctx.date !== ctx.today)
          throw new ApiError(409, "No workout recorded. Only today's workout can be started.");
        if (exerciseId !== undefined && !body.completed)
          throw new ApiError(409, "Start the workout before correcting completion");
        const routine = await Routine.findOne({ ownerId }).lean();
        if (!routine || routine.deleted) throw new ApiError(409, "Save a weekly routine first");
        if (body.routineVersion !== routine.version)
          throw new ApiError(409, "The routine changed. Reload today's workout before starting.");
        const day = routine.days.find((d) => d.day === ctx.weekday);
        if (day.kind === "unconfigured")
          throw new ApiError(409, "Configure this weekday in your routine first");
        snapshot = {
          routineName: routine.name,
          label: day.label,
          kind: day.kind,
          sourceRoutineVersion: routine.version,
          timezoneAtCreation: ctx.timezone,
          startedAt: ctx.now,
          exercises: day.exercises.map((e) => ({
            ...exerciseView(e),
            completed: false,
            completedAt: null,
          })),
        };
      }
      if (exerciseId !== undefined) {
        const exercise = snapshot.exercises.find((e) => e.id === exerciseId);
        if (!exercise) v.fail("Exercise does not belong to this daily workout");
        if (exercise.completed !== body.completed) {
          exercise.completed = body.completed;
          exercise.completedAt = body.completed ? ctx.now : null;
        }
      }
      // Existing snapshots are immutable apart from completion state.
      return old ? { exercises: snapshot.exercises } : snapshot;
    }
  );
  return dailyView(record, null, ctx);
}
module.exports = { getRoutine, saveRoutine, readDay, writeDay };
