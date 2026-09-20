"use strict";
const { randomUUID } = require("crypto");
const request = require("supertest");
const app = require("../../src/app");
const { User } = require("../../src/schemas/User.schema");
const { ByotProfile } = require("../../src/schemas/ByotProfile.schema");
const {
  ByotWorkoutRoutine: Routine,
  ByotDailyWorkout: Daily,
} = require("../../src/schemas/ByotWorkout.schema");
const clock = require("../../src/utils/byotClock");
const v = require("../../src/validators/byotWorkout.validator");
const { startMemoryMongo, stopMemoryMongo, tokenFor, uniqEmail } = require("./_setup");
jest.setTimeout(120000);
let db, user, now;
const date = "2026-09-21"; // Monday
const exercise = (values = {}) => ({
  id: `draft:${randomUUID()}`,
  name: "Squat",
  sets: 3,
  reps: "8–12",
  weightKg: 0,
  restSeconds: 60,
  notes: "Controlled",
  ...values,
});
const clean = ({ version, name, days }) => structuredClone({ version, name, days });
const call = (method, path, body, key = randomUUID(), actor = user) => {
  let r = request(app)[method](`/api/byot/workouts${path}`).set("Idempotency-Key", key);
  if (actor) r = r.set("Authorization", `Bearer ${tokenFor(actor)}`);
  return body === undefined ? r : r.send(body);
};
async function seed() {
  const days = v.emptyDays();
  days[0] = { day: "monday", label: "Legs", kind: "workout", exercises: [exercise(), exercise()] };
  days[1] = { day: "tuesday", label: "Recovery", kind: "rest", exercises: [] };
  const res = await call("put", "/routine", { version: 0, name: "My routine", days });
  expect(res.status).toBe(200);
  return res.body.data;
}
const completion = (id) => `/days/${date}/exercises/${id}`;
beforeAll(async () => {
  db = await startMemoryMongo();
  await Promise.all([Routine.init(), Daily.init(), ByotProfile.init()]);
  jest.spyOn(clock, "now").mockImplementation(() => new Date(now));
});
afterAll(async () => {
  jest.restoreAllMocks();
  await stopMemoryMongo(db);
});
beforeEach(async () => {
  now = "2026-09-21T08:00:00Z";
  user = await User.create({ name: "Workout", email: uniqEmail("workout"), role: "BYOT" });
  await ByotProfile.create({
    ownerId: user._id,
    timezone: "Asia/Kolkata",
    onboardingCompletedAt: new Date(),
  });
});
it("creates, edits, reorders, copies and clears routines with stable/new IDs", async () => {
  const p = await seed();
  const body = clean(p);
  body.days[0].exercises.reverse();
  body.days[0].exercises[0].name = "Edited";
  body.days[2] = {
    ...body.days[0],
    day: "wednesday",
    exercises: body.days[0].exercises.map((e) => ({ ...e, id: `draft:${randomUUID()}` })),
  };
  const r = await call("put", "/routine", body);
  expect(r.status).toBe(200);
  expect(r.body.data.days[0].exercises[0].id).toBe(p.days[0].exercises[1].id);
  expect(r.body.data.days[2].exercises[0].id).not.toBe(p.days[0].exercises[0].id);
  expect((await call("get", "/routine")).body.data).toEqual(r.body.data);
  expect((await call("delete", "/routine", { version: 2 })).body.data.exists).toBe(false);
});
it("GETs do not create or modify workout documents", async () => {
  expect((await call("get", "/day")).body.data.state).toBe("no_routine");
  await call("get", "/routine");
  expect(await Routine.countDocuments({ ownerId: user._id })).toBe(0);
  await seed();
  const before = await Routine.findOne({ ownerId: user._id }).lean();
  const r = await call("get", "/day");
  expect(r.body.data).toMatchObject({
    exists: false,
    totalCount: 2,
    completedCount: 0,
    percentage: 0,
  });
  await call("get", "/day?date=2026-09-20");
  expect(await Daily.countDocuments({ ownerId: user._id })).toBe(0);
  expect(await Routine.findOne({ ownerId: user._id }).lean()).toEqual(before);
});
it("completes and undoes desired states, with accurate partial/full summaries", async () => {
  const p = await seed();
  const [a, b] = p.days[0].exercises;
  let r = await call("put", completion(a.id), { version: 0, routineVersion: 1, completed: true });
  expect(r.body.data).toMatchObject({ completedCount: 1, percentage: 50, exists: true });
  r = await call("put", completion(b.id), { version: 1, completed: true });
  expect(r.body.data.percentage).toBe(100);
  r = await call("put", completion(a.id), { version: 2, completed: false });
  expect(r.body.data.completedCount).toBe(1);
  expect((await Daily.findOne({ ownerId: user._id })).exercises[0].completedAt).toBeNull();
});
it("keeps duplicate names distinct and accepts omitted fields and zero weight/rest", async () => {
  const days = v.emptyDays();
  days[0].kind = "workout";
  days[0].exercises = [
    exercise({ sets: undefined, reps: undefined, restSeconds: 0, notes: undefined }),
    { id: `draft:${randomUUID()}`, name: "Squat" },
  ];
  const r = await call("put", "/routine", { version: 0, name: "Optional", days });
  expect(r.status).toBe(200);
  expect(r.body.data.days[0].exercises[1]).toMatchObject({ sets: null, weightKg: null, reps: "" });
});
it("replays exact requests and handles concurrent first completions without duplicates", async () => {
  const p = await seed();
  const body = { version: 0, routineVersion: 1, completed: true };
  const key = randomUUID();
  const path = completion(p.days[0].exercises[0].id);
  const results = await Promise.all([call("put", path, body, key), call("put", path, body, key)]);
  expect(results.map((r) => r.status)).toEqual([200, 200]);
  expect(await Daily.countDocuments({ ownerId: user._id, date })).toBe(1);
  expect((await call("put", path, body, key)).body.data.version).toBe(1);
  expect((await call("put", path, { ...body, completed: false }, key)).status).toBe(409);
  expect((await call("put", path, body)).status).toBe(409);
});
it("concurrent starts with different keys reject stale creation explicitly", async () => {
  await seed();
  const results = await Promise.all([
    call("post", `/days/${date}/start`, { version: 0, routineVersion: 1 }),
    call("post", `/days/${date}/start`, { version: 0, routineVersion: 1 }),
  ]);
  expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  expect(await Daily.countDocuments({ ownerId: user._id })).toBe(1);
});
it("preserves snapshots through edits, exercise removal and routine deletion", async () => {
  const p = await seed();
  const start = await call("post", `/days/${date}/start`, { version: 0, routineVersion: 1 });
  const body = clean(p);
  body.days[0].exercises = [];
  body.name = "New";
  await call("put", "/routine", body);
  await call("delete", "/routine", { version: 2 });
  const read = await call("get", "/day");
  expect(read.body.data).toEqual(start.body.data);
  expect(
    (await call("put", completion(p.days[0].exercises[0].id), { version: 1, completed: true }))
      .status
  ).toBe(200);
});
it("does not reuse completion next week; preserves historical corrections and timezone", async () => {
  const p = await seed();
  const id = p.days[0].exercises[0].id;
  await call("put", completion(id), { version: 0, routineVersion: 1, completed: true });
  now = "2026-09-28T08:00:00Z";
  expect((await call("get", "/day")).body.data).toMatchObject({
    date: "2026-09-28",
    exists: false,
    completedCount: 0,
  });
  await call("put", `/days/2026-09-28/exercises/${id}`, {
    version: 0,
    routineVersion: 1,
    completed: true,
  });
  const correction = await call("put", completion(id), { version: 1, completed: false });
  expect(correction.status).toBe(200);
  expect((await call("get", "/day")).body.data.completedCount).toBe(1);
  await ByotProfile.updateOne({ ownerId: user._id }, { timezone: "America/Los_Angeles" });
  const history = (await call("get", `/day?date=${date}`)).body.data;
  expect(history).toMatchObject({ date, timezoneAtCreation: "Asia/Kolkata", completedCount: 0 });
});
it("never invents or creates missing historical workouts", async () => {
  const p = await seed();
  expect((await call("get", "/day?date=2026-09-14")).body.data).toMatchObject({
    state: "not_recorded",
    exercises: [],
  });
  expect(
    (await call("post", "/days/2026-09-14/start", { version: 0, routineVersion: 1 })).status
  ).toBe(409);
  expect(
    (
      await call("put", `/days/2026-09-14/exercises/${p.days[0].exercises[0].id}`, {
        version: 0,
        routineVersion: 1,
        completed: true,
      })
    ).status
  ).toBe(409);
});
it("rest, unconfigured and empty days are never 100% complete", async () => {
  const p = await seed();
  now = "2026-09-22T08:00:00Z";
  expect((await call("get", "/day")).body.data).toMatchObject({ state: "rest", percentage: 0 });
  expect(
    (await call("post", "/days/2026-09-22/start", { version: 0, routineVersion: 1 })).body.data
      .percentage
  ).toBe(0);
  now = "2026-09-23T08:00:00Z";
  expect((await call("get", "/day")).body.data.state).toBe("unconfigured");
  expect(
    (await call("post", "/days/2026-09-23/start", { version: 0, routineVersion: 1 })).status
  ).toBe(409);
  const body = clean(p);
  body.days[2].kind = "workout";
  await call("put", "/routine", body);
  expect(
    (await call("post", "/days/2026-09-23/start", { version: 0, routineVersion: 2 })).body.data
  ).toMatchObject({ state: "empty", percentage: 0 });
});
it("honors local midnight, leap dates and future restrictions", async () => {
  now = "2024-02-28T18:29:59Z";
  expect((await call("get", "/day")).body.data.today).toBe("2024-02-28");
  expect((await call("post", "/days/2024-02-29/start", { version: 0 })).status).toBe(400);
  now = "2024-02-28T18:30:00Z";
  expect((await call("get", "/day")).body.data).toMatchObject({
    today: "2024-02-29",
    weekday: "thursday",
  });
  expect((await call("get", "/day?date=2024-02-29")).status).toBe(200);
});
it.each([
  "2025-02-29",
  "2024-02-30",
  "2026-04-31",
  "2026-13-01",
  "2026-9-1",
  "hello",
  "1899-12-31",
])("rejects invalid date %s", async (value) => {
  expect((await call("get", `/day?date=${value}`)).status).toBe(400);
});
it.each([
  { sets: 0 },
  { sets: 2.5 },
  { sets: 101 },
  { weightKg: -1 },
  { weightKg: 1501 },
  { weightKg: 0.001 },
  { restSeconds: 1.5 },
  { restSeconds: 3601 },
  { name: " " },
  { name: "x".repeat(121) },
  { notes: "x".repeat(501) },
  { ownerId: "forged" },
  { completed: true },
  { completedAt: new Date() },
  { weightKg: "10" },
])("rejects invalid planned fields %j", async (values) => {
  const days = v.emptyDays();
  days[0].kind = "workout";
  days[0].exercises = [exercise(values)];
  expect((await call("put", "/routine", { version: 0, name: "Bad", days })).status).toBe(400);
});
it("rejects nonfinite values, duplicate IDs, too many entries and populated rest days", async () => {
  const body = { version: 0, name: "Bad", days: v.emptyDays() };
  body.days[0].kind = "workout";
  body.days[0].exercises = [exercise({ weightKg: Infinity })];
  expect(() => v.days(body.days)).toThrow();
  body.days[0].exercises = [exercise()];
  body.days[0].exercises.push(body.days[0].exercises[0]);
  expect((await call("put", "/routine", body)).status).toBe(400);
  body.days[0].exercises = Array.from({ length: 31 }, () => exercise());
  expect((await call("put", "/routine", body)).status).toBe(400);
  body.days[0].exercises = [exercise()];
  body.days[0].kind = "rest";
  expect((await call("put", "/routine", body)).status).toBe(400);
});
it("rejects forged owner/role/status and server metadata", async () => {
  const p = await seed();
  for (const key of ["ownerId", "role", "status", "receipts", "createdAt", "sourceRoutineVersion"])
    expect((await call("put", "/routine", { ...clean(p), [key]: "forged" })).status).toBe(400);
  expect(
    (
      await call("post", `/days/${date}/start`, {
        version: 0,
        routineVersion: 1,
        timezoneAtCreation: "UTC",
      })
    ).status
  ).toBe(400);
  expect(
    (
      await call("put", completion(p.days[0].exercises[0].id), {
        version: 0,
        routineVersion: 1,
        completed: true,
        completedAt: new Date(),
      })
    ).status
  ).toBe(400);
});
it("rejects foreign exercise IDs and IDs moved across days", async () => {
  const p = await seed();
  const body = clean(p);
  body.days[2] = { ...body.days[0], day: "wednesday" };
  body.days[0].exercises = [];
  expect((await call("put", "/routine", body)).status).toBe(400);
  expect(
    (
      await call("put", completion(randomUUID()), {
        version: 0,
        routineVersion: 1,
        completed: true,
      })
    ).status
  ).toBe(400);
  expect(await Daily.countDocuments({ ownerId: user._id })).toBe(0);
});
it("isolates owners on every lookup and mutation", async () => {
  const p = await seed();
  const other = await User.create({ name: "Other", email: uniqEmail("other"), role: "BYOT" });
  await ByotProfile.create({
    ownerId: other._id,
    timezone: "UTC",
    onboardingCompletedAt: new Date(),
  });
  expect((await call("get", "/routine", undefined, randomUUID(), other)).body.data.exists).toBe(
    false
  );
  expect((await call("get", "/day", undefined, randomUUID(), other)).body.data.exercises).toEqual(
    []
  );
  const forged = clean(p);
  forged.version = 0;
  expect((await call("put", "/routine", forged, randomUUID(), other)).status).toBe(400);
  expect(
    (
      await call(
        "put",
        completion(p.days[0].exercises[0].id),
        { version: 0, routineVersion: 1, completed: true },
        randomUUID(),
        other
      )
    ).status
  ).toBe(409);
  await call("delete", "/routine", { version: 0 }, randomUUID(), other);
  expect((await call("get", "/routine")).body.data).toEqual(p);
});
it.each(["ADMIN", "TRAINER", "CLIENT", null])("denies %s on every endpoint", async (role) => {
  const actor = role ? await User.create({ name: role, email: uniqEmail(role), role }) : null;
  for (const [method, path, body] of [
    ["get", "/routine"],
    ["get", "/day"],
    ["put", "/routine", {}],
    ["delete", "/routine", {}],
    ["post", `/days/${date}/start`, {}],
    ["put", completion(randomUUID()), {}],
  ])
    expect((await call(method, path, body, randomUUID(), actor)).status).toBe(role ? 403 : 401);
});
it("denies previously issued sessions after account disable", async () => {
  const token = tokenFor(user);
  await User.updateOne({ _id: user._id }, { isActive: false });
  for (const path of ["/routine", "/day"])
    expect(
      (await request(app).get(`/api/byot/workouts${path}`).set("Authorization", `Bearer ${token}`))
        .status
    ).toBe(401);
});
it("rejects stale routine edits, changed previews and stale completion updates", async () => {
  const p = await seed();
  const body = clean(p);
  await call("put", "/routine", body);
  expect((await call("put", "/routine", body)).status).toBe(409);
  const id = p.days[0].exercises[0].id;
  expect(
    (await call("put", completion(id), { version: 0, routineVersion: 1, completed: true })).status
  ).toBe(409);
  await call("put", completion(id), { version: 0, routineVersion: 2, completed: true });
  expect((await call("put", completion(id), { version: 0, completed: false })).status).toBe(409);
  expect((await call("get", "/day")).body.data.completedCount).toBe(1);
});
it("enforces routine uniqueness and exact retry receipts under concurrent creation", async () => {
  const body = { version: 0, name: "Concurrent", days: v.emptyDays() };
  const key = randomUUID();
  const results = await Promise.all([
    call("put", "/routine", body, key),
    call("put", "/routine", body, key),
  ]);
  expect(results.map((r) => r.status)).toEqual([200, 200]);
  expect(await Routine.countDocuments({ ownerId: user._id })).toBe(1);
  expect(results[0].body.data.version).toBe(1);
});
it("requires onboarding, valid versions, retry keys and explicit booleans", async () => {
  const p = await seed();
  const path = completion(p.days[0].exercises[0].id);
  for (const completed of [undefined, "true", 1, null])
    expect((await call("put", path, { version: 0, routineVersion: 1, completed })).status).toBe(
      400
    );
  expect(
    (await call("post", `/days/${date}/start`, { version: -1, routineVersion: 1 })).status
  ).toBe(400);
  expect(
    (await call("post", `/days/${date}/start`, { version: 0, routineVersion: 1 }, "bad-key")).status
  ).toBe(400);
  await ByotProfile.updateOne({ ownerId: user._id }, { onboardingCompletedAt: null });
  expect((await call("get", "/day")).status).toBe(409);
});
it("rejects future completion, foreign IDs inside an existing snapshot, and disabled writes", async () => {
  const p = await seed();
  const id = p.days[0].exercises[0].id;
  expect(
    (
      await call("put", `/days/2026-09-22/exercises/${id}`, {
        version: 0,
        routineVersion: 1,
        completed: true,
      })
    ).status
  ).toBe(400);
  await call("post", `/days/${date}/start`, { version: 0, routineVersion: 1 });
  expect(
    (await call("put", completion(randomUUID()), { version: 1, completed: true })).status
  ).toBe(400);
  await User.updateOne({ _id: user._id }, { isActive: false });
  for (const [method, path, body] of [
    ["put", "/routine", clean(p)],
    ["delete", "/routine", { version: 1 }],
    ["post", `/days/${date}/start`, { version: 1 }],
    ["put", completion(id), { version: 1, completed: true }],
  ])
    expect((await call(method, path, body)).status).toBe(401);
});
it("keeps workout payloads private in responses/admin and throttles activity", async () => {
  await seed();
  await call("post", `/days/${date}/start`, { version: 0, routineVersion: 1 });
  const activity = (await User.findById(user._id)).lastActiveAt;
  const response = await call("get", "/day");
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(response.body.data.ownerId).toBeUndefined();
  expect(response.body.data.receipts).toBeUndefined();
  expect((await User.findById(user._id)).lastActiveAt).toEqual(activity);
  const admin = require("../../src/services/admin.service");
  expect((await admin.listTrainers()).some((row) => String(row._id) === String(user._id))).toBe(
    false
  );
  expect((await admin.getPlatformMetrics()).totalClients).toBe(0);
  const malformed = await request(app)
    .put("/api/byot/workouts/routine")
    .set("Content-Type", "application/json")
    .send('{"private":secret');
  expect(malformed.status).toBe(400);
  expect(malformed.body.message).toBe("Malformed workout JSON");
  expect((await call("put", "/routine", { extra: "x".repeat(110000) })).status).toBe(413);
});
it("rejects excessive weekly counts and invalid schedule shape", async () => {
  const days = v
    .emptyDays()
    .map((day) => ({
      ...day,
      kind: "workout",
      exercises: Array.from({ length: 18 }, () => exercise()),
    }));
  expect((await call("put", "/routine", { version: 0, name: "Too many", days })).status).toBe(400);
  expect((await call("put", "/routine", { version: 0, name: "Missing", days: [] })).status).toBe(
    400
  );
});
