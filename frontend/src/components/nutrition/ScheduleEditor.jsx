import { useState } from "react";
import Button from "../ui/Button";
import {
  WEEKDAYS,
  MEAL_TYPES,
  num,
  dayTotals,
  weeklyTotals,
  sortByWeekday,
} from "../../lib/nutritionTotals";

/**
 * ScheduleEditor — the shared weekly-table editor used by BOTH the client
 * nutrition plan builder and the nutrition template editor (one source of
 * truth for the schedule UI).
 *
 * Controlled: the parent owns `schedule` in its draft; every mutation calls
 * `onChange(nextSchedule)`. Daily/weekly totals are computed with the shared
 * lib/nutritionTotals (mirrors the backend) so trainer and client never see
 * different numbers. Meal macros are kept as strings while editing; the parent
 * serializes them for the API.
 *
 * Props:
 *   schedule     [{ day, meals: [{ mealType, dishes[], calories, protein, carbs, fats, _open }] }]
 *   onChange     (nextSchedule) => void
 *   mealsPerDay  number | "" — the plan/template-level setting (drives the
 *                "N / mealsPerDay" count and the +Add meal limit)
 */

const inputClass =
  "w-full h-9 px-3 rounded-lg bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#333]";

const Chevron = ({ open }) => (
  <svg
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden
  >
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const macroSummary = (m) => `${num(m.calories)} kcal · ${num(m.protein)}P · ${num(m.carbs)}C · ${num(m.fats)}F`;

const MacroInput = ({ label, value, onChange }) => (
  <label className="block">
    <span className="text-[10.5px] uppercase tracking-wider text-text-muted">{label}</span>
    <input
      type="number" min="0" value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} mt-1`} placeholder="0"
    />
  </label>
);

const MealCard = ({ meal, index, onPatch, onRemove, onToggle }) => {
  const [dishText, setDishText] = useState("");

  const addDish = () => {
    const t = dishText.trim();
    if (!t) return;
    onPatch({ dishes: [...(meal.dishes || []), t] });
    setDishText("");
  };
  const removeDish = (i) => onPatch({ dishes: meal.dishes.filter((_, j) => j !== i) });

  return (
    <div className="rounded-lg border border-border bg-surface-elevated">
      {/* Collapsed header (click to toggle) */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
        aria-expanded={!!meal._open}
      >
        <Chevron open={meal._open} />
        <span className="text-sm font-semibold text-text-primary shrink-0">{meal.mealType}</span>
        {!meal._open && (
          <>
            <span className="flex-1 min-w-0 flex flex-wrap gap-1">
              {(meal.dishes || []).slice(0, 4).map((d, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-surface text-[11px] text-text-secondary border border-border">{d}</span>
              ))}
              {(meal.dishes || []).length > 4 && (
                <span className="text-[11px] text-text-muted">+{meal.dishes.length - 4}</span>
              )}
            </span>
            <span className="text-[11px] text-text-muted whitespace-nowrap shrink-0">{macroSummary(meal)}</span>
          </>
        )}
        {meal._open && <span className="flex-1" />}
      </button>

      {/* Expanded body */}
      {meal._open && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="flex items-center gap-2">
              <span className="text-[10.5px] uppercase tracking-wider text-text-muted">Meal</span>
              <select
                value={meal.mealType}
                onChange={(e) => onPatch({ mealType: e.target.value })}
                className="h-9 px-2 rounded-lg bg-surface border border-border text-sm text-text-primary focus:outline-none focus:border-[#333]"
              >
                {MEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <Button size="sm" variant="danger" onClick={() => onRemove(index)}>Remove meal</Button>
          </div>

          {/* Dishes editor */}
          <div>
            <span className="text-[10.5px] uppercase tracking-wider text-text-muted">Dishes</span>
            <div className="mt-1 flex flex-wrap gap-1.5 mb-2">
              {(meal.dishes || []).length === 0 && (
                <span className="text-[12px] text-text-muted">No dishes yet.</span>
              )}
              {(meal.dishes || []).map((d, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface border border-border text-[12px] text-text-primary">
                  {d}
                  <button type="button" onClick={() => removeDish(i)} aria-label={`Remove ${d}`} className="text-text-muted hover:text-red-300">
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  </button>
                </span>
              ))}
            </div>
            <input
              value={dishText}
              onChange={(e) => setDishText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDish(); } }}
              className={inputClass}
              placeholder="Type a dish and press Enter (e.g. Rice)"
            />
          </div>

          {/* Macros */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MacroInput label="Calories" value={meal.calories} onChange={(v) => onPatch({ calories: v })} />
            <MacroInput label="Protein (g)" value={meal.protein} onChange={(v) => onPatch({ protein: v })} />
            <MacroInput label="Carbs (g)" value={meal.carbs} onChange={(v) => onPatch({ carbs: v })} />
            <MacroInput label="Fats (g)" value={meal.fats} onChange={(v) => onPatch({ fats: v })} />
          </div>
        </div>
      )}
    </div>
  );
};

const DayCard = ({ day, meals, mealsPerDay, onAddMeal, onRemoveDay, onPatchMeal, onRemoveMeal, onToggleMeal }) => {
  const totals = dayTotals({ meals });
  const limitReached = Number(mealsPerDay) > 0 && meals.length >= Number(mealsPerDay);
  // mealsPerDay is a ceiling — fewer meals is valid. Only flag if a day somehow
  // exceeds the cap (the +Add meal limit should already prevent this).
  const over = Number(mealsPerDay) > 0 && meals.length > Number(mealsPerDay);

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">{day}</p>
          <p className="text-[12px] text-text-secondary mt-0.5">
            {totals.calories} kcal · {totals.protein}P · {totals.carbs}C · {totals.fats}F
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-medium px-2 py-1 rounded-full ${over ? "bg-amber-400/10 text-amber-300" : "bg-surface text-text-muted"}`}>
            {meals.length} / {Number(mealsPerDay) > 0 ? mealsPerDay : "—"} meals
          </span>
          <Button size="sm" variant="ghost" onClick={() => onRemoveDay(day)}>Remove day</Button>
        </div>
      </div>

      {meals.length === 0 ? (
        <p className="text-[13px] text-text-muted py-1">No meals yet — add up to {Number(mealsPerDay) > 0 ? mealsPerDay : "the daily"} meals.</p>
      ) : (
        <div className="space-y-2">
          {meals.map((meal, i) => (
            <MealCard
              key={i}
              meal={meal}
              index={i}
              onPatch={(patch) => onPatchMeal(day, i, patch)}
              onRemove={() => onRemoveMeal(day, i)}
              onToggle={() => onToggleMeal(day, i)}
            />
          ))}
        </div>
      )}

      <div className="mt-3" title={limitReached ? `Daily limit of ${mealsPerDay} meals reached` : undefined}>
        <Button size="sm" variant="secondary" onClick={() => onAddMeal(day)} disabled={limitReached}>
          + Add meal
        </Button>
        {limitReached && (
          <span className="ml-2 text-[11px] text-text-muted">Daily limit of {mealsPerDay} reached</span>
        )}
      </div>
    </div>
  );
};

const ScheduleEditor = ({ schedule = [], onChange, mealsPerDay }) => {
  const usedDays = new Set(schedule.map((d) => d.day));
  const available = WEEKDAYS.filter((d) => !usedDays.has(d));
  const ordered = sortByWeekday(schedule);
  const weekly = weeklyTotals(schedule);

  const addDay = (day) => {
    if (!day || usedDays.has(day)) return;
    onChange([...schedule, { day, meals: [] }]);
  };
  const removeDay = (day) => onChange(schedule.filter((d) => d.day !== day));

  const patchDayMeals = (day, mapper) =>
    onChange(schedule.map((d) => (d.day === day ? { ...d, meals: mapper(d.meals || []) } : d)));

  const addMeal = (day) =>
    patchDayMeals(day, (meals) => {
      if (Number(mealsPerDay) > 0 && meals.length >= Number(mealsPerDay)) return meals;
      const defaultType = MEAL_TYPES[Math.min(meals.length, MEAL_TYPES.length - 1)];
      return [...meals, { mealType: defaultType, dishes: [], calories: "", protein: "", carbs: "", fats: "", _open: true }];
    });
  const removeMeal = (day, idx) => patchDayMeals(day, (meals) => meals.filter((_, j) => j !== idx));
  const patchMeal = (day, idx, patch) =>
    patchDayMeals(day, (meals) => meals.map((m, j) => (j === idx ? { ...m, ...patch } : m)));
  const toggleMeal = (day, idx) =>
    patchDayMeals(day, (meals) => meals.map((m, j) => (j === idx ? { ...m, _open: !m._open } : m)));

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Weekly Schedule</p>
          {schedule.length > 0 && (
            <p className="text-[12px] text-text-secondary mt-1">
              Weekly total: {weekly.calories} kcal · {weekly.protein}P · {weekly.carbs}C · {weekly.fats}F
            </p>
          )}
        </div>
        <label className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-text-muted">Add day</span>
          <select
            value=""
            onChange={(e) => addDay(e.target.value)}
            disabled={available.length === 0}
            className="h-9 px-2 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-[#333] disabled:opacity-50"
          >
            <option value="">{available.length === 0 ? "All days added" : "+ Add a day"}</option>
            {available.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
      </div>

      {schedule.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-border rounded-xl">
          <p className="text-sm font-semibold text-text-primary">No days scheduled yet</p>
          <p className="text-[13px] text-text-secondary mt-1">Add a weekday to start building the weekly plan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ordered.map((d) => (
            <DayCard
              key={d.day}
              day={d.day}
              meals={d.meals || []}
              mealsPerDay={mealsPerDay}
              onAddMeal={addMeal}
              onRemoveDay={removeDay}
              onPatchMeal={patchMeal}
              onRemoveMeal={removeMeal}
              onToggleMeal={toggleMeal}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ScheduleEditor;
