/**
 * Frontend mirror of backend/src/utils/nutritionTotals.js.
 *
 * The builder MUST display the same daily/weekly totals the server computes,
 * so this replicates that summation EXACTLY (Number(v) || 0 per macro, summed
 * across a day's meals). Keep in lock-step with the backend util — if one
 * changes, change the other.
 */

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"];
const MACRO_KEYS = ["calories", "protein", "carbs", "fats"];

// Sunday-first to match JS Date.getDay().
const WEEKDAY_NAMES_SUN_FIRST = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * The client's LOCAL day — passed to GET /meal-logs/today (?date / ?weekday)
 * so a client near midnight sees the correct day, never server UTC. Shared by
 * the nutrition tab and the home mini card so they always agree.
 */
export function localToday() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    weekday: WEEKDAY_NAMES_SUN_FIRST[d.getDay()],
  };
}

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function sumMacros(items) {
  return (items || []).reduce(
    (acc, m) => {
      for (const k of MACRO_KEYS) acc[k] += num(m && m[k]);
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );
}

/** Daily target = sum of that day's meals. */
export function dayTotals(day) {
  return sumMacros(day && day.meals ? day.meals : []);
}

/** Weekly totals = sum across every day. */
export function weeklyTotals(schedule) {
  return sumMacros((schedule || []).map(dayTotals));
}

/**
 * Publish rule (mirrors backend): `mealsPerDay` is a CEILING. A populated day
 * may have 1..mealsPerDay meals; only days that EXCEED the cap are invalid.
 * Returns offending (over-cap) days; empty === ok.
 */
export function scheduleMealCountErrors(schedule, mealsPerDay) {
  const bad = [];
  for (const d of schedule || []) {
    const count = (d && d.meals ? d.meals : []).length;
    if (count > mealsPerDay) bad.push({ day: d.day, count });
  }
  return bad;
}

/** Render days in calendar order regardless of insertion order. */
export const sortByWeekday = (schedule) =>
  [...(schedule || [])].sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day));

/** The most meals any single day currently holds (for mealsPerDay-lowering warnings). */
export const maxMealsInAnyDay = (schedule) =>
  (schedule || []).reduce((max, d) => Math.max(max, (d.meals || []).length), 0);

/**
 * Strip UI-only fields (_open, dailyTotals, _id) and coerce macros to numbers
 * for the API payload — { day, meals: [{ mealType, dishes, calories, protein,
 * carbs, fats }] }.
 */
export function serializeSchedule(schedule) {
  return (schedule || []).map((d) => ({
    day: d.day,
    meals: (d.meals || []).map((m) => ({
      mealType: m.mealType,
      dishes: (m.dishes || []).map((s) => String(s).trim()).filter(Boolean),
      calories: num(m.calories),
      protein: num(m.protein),
      carbs: num(m.carbs),
      fats: num(m.fats),
    })),
  }));
}

/**
 * Map an API plan/template's schedule into the editor's working shape:
 * macros as strings (so inputs can be cleared), existing meals collapsed.
 */
export function scheduleToDraft(schedule) {
  return (schedule || []).map((d) => ({
    day: d.day,
    meals: (d.meals || []).map((m) => ({
      mealType: m.mealType || "Breakfast",
      dishes: Array.isArray(m.dishes) ? [...m.dishes] : [],
      calories: m.calories ?? "",
      protein: m.protein ?? "",
      carbs: m.carbs ?? "",
      fats: m.fats ?? "",
      _open: false,
    })),
  }));
}
