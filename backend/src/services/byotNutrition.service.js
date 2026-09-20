"use strict";
const mutate = require("../utils/byotMutation");
const clock = require("../utils/byotClock");
const { ByotNutritionPlan: Plan, ByotFoodLog: Log } = require("../schemas/ByotNutrition.schema");
const { ByotProfile } = require("../schemas/ByotProfile.schema");
const { localDate } = require("./byot.service");
const v = require("../validators/byotNutrition.validator");
const ApiError = require("../utils/ApiError");
const emptyDays = () => v.DAYS.map((day) => ({ day, meals: [], target: null }));
async function context(ownerId, date, now = clock.now()) {
  const profile = await ByotProfile.findOne({ ownerId });
  if (!profile?.onboardingCompletedAt) throw new ApiError(409, "Complete BYOT onboarding first");
  const today = localDate(now, profile.timezone);
  date = date === undefined ? today : v.localDate(date);
  if (date > today) throw new ApiError(400, "Actual intake cannot be logged for a future date");
  return { today, date, weekday: v.weekday(date), timezone: profile.timezone };
}
const mealView = (meal) => ({
  id: meal.id,
  name: meal.name,
  foods: meal.foods.map((food) => ({
    id: food.id,
    name: food.name,
    quantity: food.quantity,
    ...Object.fromEntries(v.KEYS.map((key) => [key, food[key]])),
  })),
  totals: v.totals([meal]),
});
function planView(plan) {
  return {
    version: plan?.version || 0,
    exists: Boolean(plan && !plan.deleted),
    days: (plan?.days || emptyDays()).map((day) => ({
      day: day.day,
      target: day.target,
      meals: day.meals.map(mealView),
      totals: v.totals(day.meals),
    })),
  };
}
function logView(log, ctx, day) {
  return {
    version: log?.version || 0,
    exists: Boolean(log),
    date: ctx.date,
    meals: (log?.meals || []).map(mealView),
    target: log ? log.target : ctx.date === ctx.today ? day?.target || null : null,
    targetSource: log
      ? log.targetSource
      : ctx.date === ctx.today && day?.target
        ? "current_preview"
        : "none",
    totals: v.totals(log?.meals || []),
  };
}
function comparison(actual, target) {
  return Object.fromEntries(
    v.KEYS.map((key) => [
      key,
      target?.[key] == null ? null : Math.round((target[key] - actual[key]) * 100) / 100,
    ])
  );
}
async function read(ownerId, date) {
  const ctx = await context(ownerId, date);
  const [plan, log] = await Promise.all([
    Plan.findOne({ ownerId }).lean(),
    Log.findOne({ ownerId, date: ctx.date }).lean(),
  ]);
  const p = planView(plan);
  const day = p.days.find((day) => day.day === ctx.weekday);
  const l = logView(log, ctx, day);
  return {
    ...ctx,
    plan: p,
    log: l,
    summary: {
      date: ctx.date,
      weekday: ctx.weekday,
      actual: l.totals,
      target: l.target,
      targetSource: l.targetSource,
      planned: day.totals,
      plannedMeals: day.meals.map((meal) => meal.name),
      remaining: comparison(l.totals, l.target),
    },
  };
}
async function savePlan(ownerId, body, key, clear = false) {
  await context(ownerId);
  v.metadata(body, clear ? [] : ["days"], key);
  const saved = await mutate(Plan, { ownerId }, body, key, clear ? "clear" : "save", (old) => ({
    days: clear ? emptyDays() : v.days(body.days, old?.days),
    deleted: clear,
  }));
  return planView(saved);
}
async function saveLog(ownerId, date, body, key, clear = false) {
  const ctx = await context(ownerId, date);
  v.metadata(body, clear ? [] : ["meals", "target"], key);
  const saved = await mutate(
    Log,
    { ownerId, date: ctx.date },
    body,
    key,
    clear ? "clear" : "save",
    async (old) => {
      let target = old?.target || null;
      let targetSource = old?.targetSource || "none";
      if (!old && ctx.date === ctx.today) {
        const plan = await Plan.findOne({ ownerId }).lean();
        target = plan?.days.find((day) => day.day === ctx.weekday)?.target || null;
        targetSource = target ? "current" : "none";
      }
      if (!clear && Object.hasOwn(body, "target")) {
        target = v.target(body.target);
        targetSource = target ? "manual" : "none";
      }
      return {
        meals: clear ? [] : v.meals(body.meals, old?.meals),
        target,
        targetSource,
        ...(!old ? { timezoneAtCreation: ctx.timezone } : {}),
      };
    }
  );
  return logView(saved, ctx);
}
module.exports = { read, savePlan, saveLog, context, comparison };
