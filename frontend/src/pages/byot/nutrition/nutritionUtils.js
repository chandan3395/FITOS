export const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
export const nutrients = [
  ["calories", "Calories", "kcal"],
  ["protein", "Protein", "g"],
  ["carbs", "Carbs", "g"],
  ["fats", "Fats", "g"],
];
export const format = (value) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value ?? 0);
export const draftId = () => `draft:${crypto.randomUUID()}`;
export const newFood = () => ({
  id: draftId(),
  name: "",
  quantity: "",
  calories: 0,
  protein: 0,
  carbs: 0,
  fats: 0,
});
export const newMeal = () => ({ id: draftId(), name: "Meal", foods: [newFood()] });
export const copyMeal = (meal) => ({
  ...meal,
  id: draftId(),
  foods: meal.foods.map((food) => ({ ...food, id: draftId() })),
});
export const totals = (meals) =>
  Object.fromEntries(
    nutrients.map(([key]) => [
      key,
      meals.reduce(
        (sum, meal) =>
          sum +
          meal.foods.reduce((sum, food) => sum + Math.round((Number(food[key]) || 0) * 100), 0),
        0
      ) / 100,
    ])
  );
export const cleanMeals = (meals) =>
  meals.map((meal) => ({
    id: meal.id,
    name: meal.name,
    foods: meal.foods.map((food) => ({
      id: food.id,
      name: food.name,
      quantity: food.quantity,
      // Blank numeric inputs must fail server validation, including on a
      // hidden weekday; do not silently turn a cleared field into zero.
      ...Object.fromEntries(nutrients.map(([key]) => [key, food[key] === "" ? null : Number(food[key])])),
    })),
  }));
export const cleanTarget = (target) => {
  if (!target) return null;
  const values = Object.fromEntries(
    nutrients.map(([key]) => [
      key,
      target[key] === "" || target[key] == null ? null : Number(target[key]),
    ])
  );
  return Object.values(values).every((value) => value === null) ? null : values;
};
export const planDraft = (plan) => ({
  version: plan.version,
  days: plan.days.map((day) => ({
    day: day.day,
    target: cleanTarget(day.target),
    meals: cleanMeals(day.meals),
  })),
});
export const logDraft = (log) => ({ version: log.version, meals: cleanMeals(log.meals) });
export const button =
  "min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed";
export const primary = `${button} bg-primary text-on-primary font-semibold`;
export const input =
  "mt-1 block w-full min-w-0 rounded-lg border border-border bg-bg px-3 py-3 text-text-primary";
