import { useCallback, useEffect, useRef, useState } from "react";
import service from "../../../services/byotNutritionService";
import PortalPageHeader from "../PortalPageHeader";
import MealEditor from "./MealEditor";
import TargetEditor from "./TargetEditor";
import NutritionSummary from "./NutritionSummary";
import {
  button,
  primary,
  input,
  days,
  nutrients,
  format,
  totals,
  copyMeal,
  cleanMeals,
  cleanTarget,
  planDraft,
  logDraft,
} from "./nutritionUtils";

export default function NutritionPage({ onDirty }) {
  const [data, setData] = useState(null);
  const [plan, setPlan] = useState(null);
  const [log, setLog] = useState(null);
  const [tab, setTab] = useState("log");
  const [day, setDay] = useState("monday");
  const [copyTo, setCopyTo] = useState("tuesday");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState(false);
  const baseline = useRef({ plan: "", log: "" });
  const pending = useRef(null);
  const busy = useRef(false);
  const sequence = useRef(0);
  const planDirty = plan && JSON.stringify(plan) !== baseline.current.plan;
  const logDirty = log && JSON.stringify(log) !== baseline.current.log;
  useEffect(() => {
    onDirty(Boolean(planDirty || logDirty));
    return () => onDirty(false);
  }, [onDirty, planDirty, logDirty]);
  const load = useCallback(async (date, replacePlan = false) => {
    const request = ++sequence.current;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const next = await service.day(date);
      if (request !== sequence.current) return;
      setData((previous) => ({
        ...next,
        plan: replacePlan || !previous ? next.plan : previous.plan,
      }));
      const nextLog = logDraft(next.log);
      setLog(nextLog);
      baseline.current.log = JSON.stringify(nextLog);
      if (replacePlan) {
        const nextPlan = planDraft(next.plan);
        setPlan(nextPlan);
        baseline.current.plan = JSON.stringify(nextPlan);
        setDay(next.weekday);
      }
      setConflict(false);
    } catch (err) {
      if (request === sequence.current)
        setError(
          err.response?.data?.message || "Unable to load nutrition. Your edits are still here."
        );
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    load(undefined, true);
    const request = sequence.current;
    return () => {
      sequence.current = request + 1;
    };
  }, [load]);
  function reload() {
    if (
      (planDirty || logDirty) &&
      !window.confirm("Discard unsaved edits and load the latest saved nutrition data?")
    )
      return;
    load(data?.date, true);
  }
  async function save(event) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    const body =
      tab === "plan"
        ? {
            version: plan.version,
            days: plan.days.map((day) => ({
              day: day.day,
              target: cleanTarget(day.target),
              meals: cleanMeals(day.meals),
            })),
          }
        : {
            version: log.version,
            meals: cleanMeals(log.meals),
            ...(Object.hasOwn(log, "target") ? { target: cleanTarget(log.target) } : {}),
          };
    const signature = JSON.stringify({ tab, date: data.date, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    try {
      const saved =
        tab === "plan"
          ? await service.savePlan(body, pending.current.key)
          : await service.saveLog(data.date, body, pending.current.key);
      if (tab === "plan") {
        const next = planDraft(saved);
        setPlan(next);
        baseline.current.plan = JSON.stringify(next);
        setData((previous) => {
          const applicable = saved.days.find((day) => day.day === previous.weekday)?.target || null;
          return {
            ...previous,
            plan: saved,
            log:
              !previous.log.exists && previous.date === previous.today
                ? {
                    ...previous.log,
                    target: applicable,
                    targetSource: applicable ? "current_preview" : "none",
                  }
                : previous.log,
          };
        });
      } else {
        const next = logDraft(saved);
        setLog(next);
        baseline.current.log = JSON.stringify(next);
        setData((previous) => ({ ...previous, log: saved }));
      }
      pending.current = null;
      setConflict(false);
      setMessage(
        tab === "plan" ? "Weekly plan saved." : "Daily log saved. Your food counts immediately."
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Save failed. Your entries are preserved. Try Save again."
      );
      setConflict(err.response?.status === 409);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  function changeDay(next) {
    setDay(next);
    setMessage("");
  }
  const selectedDay = plan?.days.find((item) => item.day === day);
  const plannedToday = data?.plan.days.find((item) => item.day === data.weekday);
  const updateDay = (value) =>
    setPlan({ ...plan, days: plan.days.map((item) => (item.day === day ? value : item)) });
  const target = log && Object.hasOwn(log, "target") ? log.target : data?.log.target;
  return (
    <div className="space-y-4">
      <PortalPageHeader title="Nutrition" description="Plan your week and log what you eat." action={<button type="submit" form="byot-nutrition-form" className={primary} disabled={loading || saving || !(tab === "plan" ? planDirty : logDirty)}>Save changes</button>} />
      <div className="byot-segments" aria-label="Nutrition views">
        <button
          className={tab === "plan" ? primary : button}
          disabled={saving}
          aria-pressed={tab === "plan"}
          onClick={() => setTab("plan")}
        >
          Weekly Plan{planDirty ? " *" : ""}
        </button>
        <button
          className={tab === "log" ? primary : button}
          disabled={saving}
          aria-pressed={tab === "log"}
          onClick={() => setTab("log")}
        >
          Daily Log{logDirty ? " *" : ""}
        </button>
      </div>
      {error && (
        <div role="alert" className="border border-red-400/40 rounded-xl p-4 space-y-3">
          <p>{error}</p>
          {conflict && (
            <p className="text-sm">
              Another save changed this record. Keep your entries visible to compare or copy them
              before reloading. There is no automatic overwrite.
            </p>
          )}
          <button type="button" className={button} onClick={reload}>
            Reload saved data
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="text-primary">
          {message}
        </p>
      )}
      {loading && <p role="status">Loading nutrition…</p>}
      {data && plan && log && (
        <form id="byot-nutrition-form" onSubmit={save} className="space-y-4">
          <fieldset disabled={saving || loading} className="min-w-0 space-y-4">
            {tab === "plan" ? (
              <>
                <div className="flex flex-wrap gap-2" aria-label="Weekdays">
                  {days.map((value) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={day === value}
                      className={`${day === value ? primary : button} capitalize`}
                      onClick={() => changeDay(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <h2 className="text-2xl font-semibold capitalize">{day} plan</h2>
                <TargetEditor
                  value={selectedDay.target}
                  onChange={(target) => updateDay({ ...selectedDay, target })}
                  label={`${day[0].toUpperCase() + day.slice(1)} targets (optional)`}
                />
                <p className="text-sm text-text-secondary">
                  Targets apply to new logs. Saved logs keep their original targets.
                </p>
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="font-semibold mb-2">
                    Planned total {planDirty && "(unsaved preview)"}
                  </h3>
                  <p>
                    {nutrients
                      .map(
                        ([key, label, unit]) =>
                          `${label}: ${format(totals(selectedDay.meals)[key])} ${unit}`
                      )
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-sm">
                    Copy this day to
                    <select
                      className={input}
                      value={copyTo}
                      onChange={(e) => setCopyTo(e.target.value)}
                    >
                      {days.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className={button}
                    disabled={copyTo === day}
                    onClick={() => {
                      const destination = plan.days.find((item) => item.day === copyTo);
                      if (
                        destination.meals.length &&
                        !window.confirm(
                          `Replace the meals on ${copyTo}? Its target will stay unchanged.`
                        )
                      )
                        return;
                      setPlan({
                        ...plan,
                        days: plan.days.map((item) =>
                          item.day === copyTo
                            ? { ...item, meals: selectedDay.meals.map(copyMeal) }
                            : item
                        ),
                      });
                      setMessage(`Meals copied to ${copyTo}. Save the weekly plan to keep them.`);
                    }}
                  >
                    Copy day’s meals
                  </button>
                </div>
                <MealEditor
                  meals={selectedDay.meals}
                  onChange={(meals) => updateDay({ ...selectedDay, meals })}
                />
                <button
                  type="button"
                  className={button}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Clear all weekly meals and targets? This will not change actual logs. Save to apply."
                      )
                    )
                      setPlan({
                        ...plan,
                        days: days.map((day) => ({ day, meals: [], target: null })),
                      });
                  }}
                >
                  Clear weekly plan
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-end justify-between gap-3">
                <label className="block text-sm">
                  Log date
                  <input
                    className={input}
                    type="date"
                    min="1900-01-01"
                    max={data.today}
                    required
                    value={data.date}
                    onChange={(event) => {
                      const next = event.target.value;
                      if (!next || next > data.today) {
                        setError("Choose today or an earlier date for actual food.");
                        return;
                      }
                      if (
                        logDirty &&
                        !window.confirm("Discard unsaved daily log edits before changing the date?")
                      )
                        return;
                      load(next);
                    }}
                  />
                </label>
                <div>
                  <h2 className="text-lg font-semibold">{new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${data.date}T12:00:00Z`))}</h2>
                  <p className="text-xs text-text-secondary">{data.timezone}</p>
                </div>
                </div>
                <NutritionSummary
                  actual={data.log.totals}
                  target={data.log.target}
                  planned={plannedToday.totals}
                />
                <p className="text-sm text-text-secondary">
                  Actual totals are saved values; planned totals use your current {data.weekday} plan.
                </p>
                <details className="rounded-xl border border-border bg-card p-4">
                  <summary className="cursor-pointer min-h-11 font-medium">
                    Set or correct this date’s target
                  </summary>
                  <p className="text-sm text-text-secondary mb-4">
                    {data.log.targetSource === "current_preview"
                      ? "The current weekday target will be captured on the first save."
                      : data.log.targetSource === "current"
                        ? "This target was captured when this log was first saved. Weekly plan changes do not update it."
                        : data.log.targetSource === "manual"
                          ? "This date has an explicitly entered target."
                          : "No historical target is assumed. Enter a target only if you want it applied to this date."}{" "}
                    Any changes here explicitly replace only this date’s target when you save.
                  </p>
                  <TargetEditor
                    value={target}
                    onChange={(target) => setLog({ ...log, target })}
                    label="Target for this date (optional)"
                  />
                  <button
                    type="button"
                    className={`${button} mt-3`}
                    onClick={() => setLog({ ...log, target: null })}
                  >
                    Use no target for this date
                  </button>
                </details>
                <section className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <h3 className="font-semibold">Copy from the saved {data.weekday} plan</h3>
                  <p className="text-sm text-text-secondary">
                    Copies are independent. Adjust them below, then save your daily log.
                  </p>
                  {plannedToday.meals.length ? (
                    plannedToday.meals.map((meal, i) => (
                      <button
                        type="button"
                        key={meal.id}
                        className={`${button} mr-2 mb-2 max-w-full break-words`}
                        disabled={log.meals.length >= 12}
                        onClick={(event) => {
                          if (event.detail > 1) return;
                          setLog((previous) => ({
                            ...previous,
                            meals: [...previous.meals, copyMeal(meal)],
                          }));
                          setMessage(
                            `${meal.name} copied to the log draft. Adjust its values and save.`
                          );
                        }}
                      >
                        Copy {meal.name} ({i + 1}) to log
                      </button>
                    ))
                  ) : (
                    <p className="text-text-secondary">
                      No planned meals for this weekday. You can still add any meal below.
                    </p>
                  )}
                </section>
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="font-semibold mb-2">Log preview {logDirty && "(unsaved)"}</h3>
                  <p>
                    {nutrients
                      .map(
                        ([key, label, unit]) =>
                          `${label}: ${format(totals(log.meals)[key])} ${unit}`
                      )
                      .join(" · ")}
                  </p>
                </div>
                <MealEditor meals={log.meals} onChange={(meals) => setLog({ ...log, meals })} />
                <button
                  type="button"
                  className={button}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Clear all meals for this date? The target will stay unchanged. Save to apply."
                      )
                    )
                      setLog({ ...log, meals: [] });
                  }}
                >
                  Clear daily meals
                </button>
              </>
            )}
          </fieldset>
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
            <button
              type="submit"
              className={primary}
              disabled={loading || saving || !(tab === "plan" ? planDirty : logDirty)}
            >
              {saving ? "Saving…" : tab === "plan" ? "Save weekly plan" : "Save daily log"}
            </button>
            <span className="text-sm text-text-secondary">
              {planDirty || logDirty ? "You have unsaved edits." : "All changes saved."}
            </span>
          </div>
        </form>
      )}
    </div>
  );
}
