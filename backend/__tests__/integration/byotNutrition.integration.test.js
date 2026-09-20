"use strict";
const { randomUUID } = require("crypto");
const request = require("supertest");
const app = require("../../src/app");
const { User } = require("../../src/schemas/User.schema");
const { ByotProfile } = require("../../src/schemas/ByotProfile.schema");
const {
  ByotNutritionPlan: Plan,
  ByotFoodLog: Log,
} = require("../../src/schemas/ByotNutrition.schema");
const service = require("../../src/services/byotNutrition.service");
const v = require("../../src/validators/byotNutrition.validator");
const { startMemoryMongo, stopMemoryMongo, tokenFor, uniqEmail } = require("./_setup");
jest.setTimeout(120000);
let db, user, today, weekday;
const draft = () => `draft:${randomUUID()}`;
const food = (values = {}) => ({
  id: draft(),
  name: "Eggs",
  quantity: "2 eggs",
  calories: 100.1,
  protein: 10.2,
  carbs: 0,
  fats: 0.3,
  ...values,
});
const meal = (values = {}) => ({ id: draft(), name: "Snack", foods: [food()], ...values });
const days = () => v.DAYS.map((day) => ({ day, target: null, meals: [] }));
const cleanMeals = (meals) => meals.map(({ id, name, foods }) => ({ id, name, foods }));
const cleanPlan = (plan) => ({
  version: plan.version,
  days: plan.days.map(({ day, target, meals }) => ({ day, target, meals: cleanMeals(meals) })),
});
const cloneMeals = (meals) =>
  cleanMeals(meals).map((meal) => ({
    ...meal,
    id: draft(),
    foods: meal.foods.map((food) => ({ ...food, id: draft() })),
  }));
const call = (method, path, body, key = randomUUID(), actor = user) => {
  let r = request(app)
    [method](`/api/byot/nutrition${path}`)
    .set("Authorization", `Bearer ${tokenFor(actor)}`)
    .set("Idempotency-Key", key);
  return body === undefined ? r : r.send(body);
};
async function seedPlan(target = { calories: 2000, protein: 100, carbs: 200, fats: 60 }) {
  const body = { version: 0, days: days() };
  body.days.find((day) => day.day === weekday).meals = [meal()];
  body.days.find((day) => day.day === weekday).target = target;
  const res = await call("put", "/plan", body);
  expect(res.status).toBe(200);
  return res.body.data;
}
beforeAll(async () => {
  db = await startMemoryMongo();
  await Promise.all([Plan.init(), Log.init(), ByotProfile.init()]);
});
afterAll(() => stopMemoryMongo(db));
beforeEach(async () => {
  user = await User.create({ name: "Nutrition", email: uniqEmail("nutrition"), role: "BYOT" });
  await ByotProfile.create({
    ownerId: user._id,
    timezone: "Asia/Kolkata",
    onboardingCompletedAt: new Date(),
  });
  ({ today, weekday } = await service.context(user._id));
});
it("creates, reorders, copies, edits and clears the weekly plan with stable IDs", async () => {
  const body = { version: 0, days: days() };
  body.days[0].meals = [
    meal(),
    meal({
      foods: [food({ calories: 0.2 }), food({ calories: 0, protein: 0, carbs: 0, fats: 0 })],
    }),
  ];
  const created = await call("put", "/plan", body);
  expect(created.status).toBe(200);
  expect(created.body.data.days[0].totals).toEqual({
    calories: 100.3,
    protein: 20.4,
    carbs: 0,
    fats: 0.6,
  });
  expect(created.body.data.days[0].meals.map((m) => m.name)).toEqual(["Snack", "Snack"]);
  let update = cleanPlan(created.body.data);
  update.days[1].meals = cloneMeals(update.days[0].meals);
  update.days[0].meals.reverse();
  const edited = await call("put", "/plan", update);
  expect(edited.status).toBe(200);
  expect(edited.body.data.days[0].meals[1].id).toBe(created.body.data.days[0].meals[0].id);
  expect(edited.body.data.days[1].meals[0].id).not.toBe(created.body.data.days[0].meals[0].id);
  expect(edited.body.data.days[1].meals[0].foods[0].id).not.toBe(
    created.body.data.days[0].meals[0].foods[0].id
  );
  expect((await call("get", "/plan")).body.data).toEqual(edited.body.data);
  const deleted = await call("delete", "/plan", { version: 2 });
  expect(deleted.status).toBe(200);
  expect(deleted.body.data.exists).toBe(false);
  expect(deleted.body.data.days.every((day) => day.meals.length === 0)).toBe(true);
  expect((await call("put", "/plan", body)).status).toBe(409); // no ABA after deletion
});
it("logs without a plan, immediately totals actuals, corrects and deletes food", async () => {
  expect((await call("get", "/plan")).body.data.exists).toBe(false);
  const created = await call("put", `/logs/${today}`, { version: 0, meals: [meal()] });
  expect(created.status).toBe(200);
  expect(created.body.data.totals.calories).toBe(100.1);
  expect(created.body.data.target).toBeNull();
  expect(created.body.data).not.toHaveProperty("status");
  const meals = cleanMeals(created.body.data.meals);
  meals[0].foods[0].calories = 250.25;
  meals[0].foods.push(food({ calories: 0.75 }));
  const edited = await call("put", `/logs/${today}`, { version: 1, meals });
  expect(edited.body.data.totals.calories).toBe(251);
  expect((await call("get", "/summary")).body.data.actual.calories).toBe(251);
  const removed = await call("put", `/logs/${today}`, {
    version: 2,
    meals: [{ ...cleanMeals(edited.body.data.meals)[0], foods: [] }],
  });
  expect(removed.body.data.totals.calories).toBe(0);
  expect((await call("delete", `/logs/${today}`, { version: 3 })).body.data.meals).toEqual([]);
});
it("copied meals and targets remain independent after plan edits and deletion", async () => {
  let plan = await seedPlan();
  const day = plan.days.find((day) => day.day === weekday);
  const saved = await call("put", `/logs/${today}`, { version: 0, meals: cloneMeals(day.meals) });
  expect(saved.body.data.target.calories).toBe(2000);
  expect(saved.body.data.targetSource).toBe("current");
  const update = cleanPlan(plan);
  update.days.find((d) => d.day === weekday).meals[0].foods[0].calories = 999;
  update.days.find((d) => d.day === weekday).target.calories = 3000;
  expect((await call("put", "/plan", update)).status).toBe(200);
  expect((await call("get", `/logs/${today}`)).body.data).toEqual(saved.body.data);
  expect((await call("delete", "/plan", { version: 2 })).status).toBe(200);
  expect((await call("get", `/logs/${today}`)).body.data).toEqual(saved.body.data);
  const summary = (await call("get", "/summary")).body.data;
  expect(summary.remaining.calories).toBe(1899.9);
  expect(summary.planned.calories).toBe(0);
});
it("deduplicates retried and simultaneous saves while allowing an intentional repeat", async () => {
  const key = randomUUID();
  const body = { version: 0, meals: [meal()] };
  const results = await Promise.all([
    call("put", `/logs/${today}`, body, key),
    call("put", `/logs/${today}`, body, key),
  ]);
  expect(results.map((r) => r.status)).toEqual([200, 200]);
  expect(results[0].body.data.meals).toHaveLength(1);
  expect((await call("put", `/logs/${today}`, body, key)).body.data.version).toBe(1);
  expect((await call("put", `/logs/${today}`, { ...body, meals: [] }, key)).status).toBe(409);
  const saved = results[0].body.data;
  const repeat = await call("put", `/logs/${today}`, {
    version: 1,
    meals: [...cleanMeals(saved.meals), ...cloneMeals(saved.meals)],
  });
  expect(repeat.body.data.meals).toHaveLength(2);
  expect(repeat.body.data.totals.calories).toBe(200.2);
  expect(await Log.countDocuments({ ownerId: user._id, date: today })).toBe(1);
  // Retry of an old accepted request cannot append again after a later edit.
  expect((await call("put", `/logs/${today}`, body, key)).body.data.meals).toHaveLength(2);
});
it("preserves historical targets, allows explicit corrections, and retains them on clear", async () => {
  await seedPlan();
  const date = "2024-02-29";
  const old = await call("put", `/logs/${date}`, { version: 0, meals: [meal()] });
  expect(old.status).toBe(200);
  expect(old.body.data.target).toBeNull();
  const explicit = await call("put", `/logs/${date}`, {
    version: 1,
    meals: cleanMeals(old.body.data.meals),
    target: { calories: 90, protein: 0 },
  });
  expect(explicit.body.data.targetSource).toBe("manual");
  const summary = (await call("get", `/summary?date=${date}`)).body.data;
  expect(summary.remaining.calories).toBe(-10.1);
  expect(summary.remaining.protein).toBe(-10.2);
  expect(summary.remaining.fats).toBeNull();
  const cleared = await call("delete", `/logs/${date}`, { version: 2 });
  expect(cleared.body.data.target.calories).toBe(90);
  await ByotProfile.updateOne({ ownerId: user._id }, { timezone: "America/Los_Angeles" });
  expect((await call("get", `/logs/${date}`)).body.data.date).toBe(date);
  expect(await Log.countDocuments({ ownerId: user._id, date })).toBe(1);
});
it.each([
  "2025-02-29",
  "2024-02-30",
  "2024-13-01",
  "2024-00-01",
  "2024-01-00",
  "2024-1-01",
  "2024-01-01T00:00:00Z",
  "1899-12-31",
  "9999-12-31",
])("rejects invalid/future local date %s", async (date) => {
  expect((await call("put", `/logs/${date}`, { version: 0, meals: [] })).status).toBe(400);
});
it("uses the saved timezone across midnight and DST boundaries", async () => {
  await ByotProfile.updateOne({ ownerId: user._id }, { timezone: "Pacific/Kiritimati" });
  const east = await service.context(user._id, undefined, new Date("2026-03-08T10:30:00Z"));
  expect(east.today).toBe("2026-03-09");
  expect(east.weekday).toBe("monday");
  await ByotProfile.updateOne({ ownerId: user._id }, { timezone: "America/Los_Angeles" });
  const west = await service.context(user._id, undefined, new Date("2026-03-08T07:30:00Z"));
  expect(west.today).toBe("2026-03-07");
  expect(west.weekday).toBe("saturday");
});
it("rejects stale plan and log writes, including simultaneous edits", async () => {
  const plan = await seedPlan();
  const body = cleanPlan(plan);
  const results = await Promise.all([call("put", "/plan", body), call("put", "/plan", body)]);
  expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  const log = { version: 0, meals: [meal()] };
  expect((await call("put", `/logs/${today}`, log)).status).toBe(200);
  expect((await call("put", `/logs/${today}`, log)).status).toBe(409);
  expect((await call("delete", `/logs/${today}`, { version: 0 })).status).toBe(409);
});
it("isolates owners and rejects another owner's nested IDs", async () => {
  const saved = await seedPlan();
  const other = await User.create({ name: "Other", role: "BYOT", email: uniqEmail("other") });
  await ByotProfile.create({
    ownerId: other._id,
    timezone: "UTC",
    onboardingCompletedAt: new Date(),
  });
  const own = await call("get", `/plan?ownerId=${user._id}`, undefined, randomUUID(), other);
  expect(own.body.data.exists).toBe(false);
  expect(
    (await call("put", "/plan", { ...cleanPlan(saved), version: 0 }, randomUUID(), other)).status
  ).toBe(400);
  expect(
    (
      await call(
        "put",
        `/logs/${today}`,
        { version: 0, meals: cleanMeals(saved.days.find((d) => d.day === weekday).meals) },
        randomUUID(),
        other
      )
    ).status
  ).toBe(400);
  expect((await call("get", `/plan/${user._id}`, undefined, randomUUID(), other)).status).toBe(404);
  expect((await call("get", "/plan")).body.data).toEqual(saved);
});
it.each(["ADMIN", "TRAINER", "CLIENT"])(
  "denies all personal nutrition operations to %s",
  async (role) => {
    const actor = await User.create({ role, name: role, email: uniqEmail(role) });
    for (const [method, path, body] of [
      ["get", "/plan"],
      ["put", "/plan", { version: 0, days: days() }],
      ["delete", "/plan", { version: 0 }],
      ["get", `/logs/${today}`],
      ["put", `/logs/${today}`, { version: 0, meals: [] }],
      ["delete", `/logs/${today}`, { version: 0 }],
      ["get", "/summary"],
    ]) {
      expect((await call(method, path, body, randomUUID(), actor)).status).toBe(403);
    }
  }
);
it("rejects anonymous, disabled, and not-onboarded users", async () => {
  expect((await request(app).get("/api/byot/nutrition/plan")).status).toBe(401);
  await User.updateOne({ _id: user._id }, { isActive: false });
  expect((await call("get", "/plan")).status).toBe(401);
  expect((await call("put", `/logs/${today}`, { version: 0, meals: [] })).status).toBe(401);
  await User.updateOne({ _id: user._id }, { isActive: true });
  await ByotProfile.updateOne({ ownerId: user._id }, { onboardingCompletedAt: null });
  expect((await call("get", "/plan")).status).toBe(409);
});
it.each([
  "ownerId",
  "role",
  "status",
  "totals",
  "targetSource",
  "timezoneAtCreation",
  "receipts",
  "createdAt",
])("rejects mass assignment of %s", async (key) => {
  expect(
    (await call("put", `/logs/${today}`, { version: 0, meals: [], [key]: "forged" })).status
  ).toBe(400);
});
it("rejects duplicate IDs and IDs moved between parents", async () => {
  const m = meal();
  expect((await call("put", `/logs/${today}`, { version: 0, meals: [m, m] })).status).toBe(400);
  const saved = await call("put", `/logs/${today}`, { version: 0, meals: [meal(), meal()] });
  const meals = cleanMeals(saved.body.data.meals);
  const moved = meals[0].foods.pop();
  meals[1].foods.push(moved);
  expect((await call("put", `/logs/${today}`, { version: 1, meals })).status).toBe(400);
  expect(
    (
      await call("put", `/logs/${today}`, {
        version: 1,
        meals: [meal({ foods: [food({ totals: 500 })] })],
      })
    ).status
  ).toBe(400);
});
it.each([
  { calories: -1 },
  { protein: 2001 },
  { calories: 10001 },
  { calories: "20" },
  { fats: null },
  { carbs: 0.001 },
  { name: "x".repeat(121) },
  { quantity: "" },
  { id: "not-an-id" },
])("validates food values %j", async (fields) => {
  expect(
    (await call("put", `/logs/${today}`, { version: 0, meals: [meal({ foods: [food(fields)] })] }))
      .status
  ).toBe(400);
});
it("enforces bounded arrays, finite numbers, target bounds and request metadata", async () => {
  expect(
    (
      await call("put", `/logs/${today}`, {
        version: 0,
        meals: Array.from({ length: 13 }, () => meal()),
      })
    ).status
  ).toBe(400);
  expect(
    (
      await call("put", `/logs/${today}`, {
        version: 0,
        meals: [meal({ foods: Array.from({ length: 21 }, () => food()) })],
      })
    ).status
  ).toBe(400);
  expect(
    (await call("put", `/logs/${today}`, { version: 0, meals: [], target: { calories: 30001 } }))
      .status
  ).toBe(400);
  expect((await call("put", "/plan", { version: 0, days: [] })).status).toBe(400);
  expect((await call("put", `/logs/${today}`, { meals: [] })).status).toBe(400);
  expect((await call("put", `/logs/${today}`, { version: 0, meals: [] }, "bad-key")).status).toBe(
    400
  );
  for (const calories of [Infinity, NaN, -Infinity])
    expect(() => v.meals([meal({ foods: [food({ calories })] })])).toThrow();
});
it("rejects excess document foods, malformed JSON, and oversized payloads without echoing inputs", async () => {
  const meals = Array.from({ length: 7 }, () =>
    meal({ foods: Array.from({ length: 20 }, () => food()) })
  );
  expect((await call("put", `/logs/${today}`, { version: 0, meals })).status).toBe(400);
  const malformed = await request(app)
    .put(`/api/byot/nutrition/logs/${today}`)
    .set("Content-Type", "application/json")
    .send('{"meals":secret');
  expect(malformed.status).toBe(400);
  expect(malformed.body.message).toBe("Malformed nutrition JSON");
  const large = await call("put", `/logs/${today}`, {
    version: 0,
    meals: [],
    extra: "x".repeat(110000),
  });
  expect(large.status).toBe(413);
  expect(large.body.message).not.toContain("xxxxx");
});
it("keeps BYOT nutrition out of legacy admin results and throttles successful activity", async () => {
  await seedPlan();
  await call("put", `/logs/${today}`, { version: 0, meals: [meal()] });
  const activity = (await User.findById(user._id)).lastActiveAt;
  expect(activity).toBeInstanceOf(Date);
  await call("get", "/summary");
  expect((await User.findById(user._id)).lastActiveAt).toEqual(activity);
  const admin = require("../../src/services/admin.service");
  expect((await admin.listTrainers()).some((row) => String(row._id) === String(user._id))).toBe(
    false
  );
  expect((await admin.getPlatformMetrics()).totalClients).toBe(0);
});
