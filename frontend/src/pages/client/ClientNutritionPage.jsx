import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { EmptyState, ErrorState, SkeletonDetail, Toast } from "../../components/feedback/States";
import nutritionService from "../../services/nutritionService";
import mealCheckinService from "../../services/mealCheckinService";
import mealLogService from "../../services/mealLogService";
import NutritionCard from "../../components/nutrition/NutritionCard";
import MealLogList from "../../components/nutrition/MealLogList";
import { localToday } from "../../lib/nutritionTotals";

/**
 * ClientNutritionPage — the client's ACTIVE nutrition plan plus a daily
 * Meal Check-in: they upload photos of each meal as proof of adherence and
 * see their coach's review status + feedback. Photos upload directly to
 * Cloudinary (signed) — only metadata touches our backend.
 */
const Stat = ({ label, value, unit }) => (
  <div className="rounded-lg border border-border bg-surface-elevated p-4">
    <p className="text-[11px] uppercase tracking-wider text-text-muted">{label}</p>
    <p className="text-2xl font-semibold text-text-primary mt-1">
      {value ?? "—"}
      {value != null && unit && <span className="ml-1 text-sm text-text-muted">{unit}</span>}
    </p>
  </div>
);

// ── Meal check-in helpers ───────────────────────────────────────
const MEALS = [
  ["breakfast", "Breakfast"],
  ["lunch", "Lunch"],
  ["dinner", "Dinner"],
  ["snack", "Snack"],
];
const MEAL_KEYS = MEALS.map(([k]) => k);

const todayStr = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const fmtDay = (d) => {
  if (!d) return "—";
  const parsed = new Date(`${d}T00:00:00`);
  return isNaN(parsed.getTime())
    ? d
    : parsed.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

const MEAL_STATUS = {
  PENDING:  { label: "Pending review",  cls: "bg-amber-400/10 text-amber-300" },
  REVIEWED: { label: "Approved ✓",      cls: "bg-emerald-400/10 text-emerald-300" },
  FLAGGED:  { label: "Needs attention", cls: "bg-red-500/10 text-red-300" },
};

const MealCheckinSection = () => {
  const [date, setDate]   = useState(todayStr());
  const [files, setFiles] = useState({ breakfast: null, lunch: null, dinner: null, snack: null });
  const [note, setNote]   = useState("");
  const [uploading, setUploading] = useState(false);
  const [mine, setMine]   = useState([]);
  const [toast, setToast] = useState(null);
  const formRef = useRef(null);

  const load = useCallback(async () => {
    setMine(await mealCheckinService.listMine().catch(() => []));
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!date) return setToast({ kind: "error", message: "Pick a date" });
    if (MEAL_KEYS.every((k) => !files[k])) {
      return setToast({ kind: "error", message: "Add at least one meal photo" });
    }
    setUploading(true);
    try {
      await mealCheckinService.upload({ date, note, ...files });
      setFiles({ breakfast: null, lunch: null, dinner: null, snack: null });
      setNote("");
      if (formRef.current) formRef.current.reset();
      setToast({ kind: "success", message: "Meals logged — your coach will review them" });
      load();
    } catch (err) {
      setToast({ kind: "error", message: err?.response?.data?.message || "Upload failed" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Card>
        <Card.Header>
          <Card.Title>Log Today&apos;s Meals</Card.Title>
          <Card.Description>
            Upload a photo of each meal as proof of adherence. Your coach reviews them and leaves feedback.
          </Card.Description>
        </Card.Header>
        <Card.Body>
          <form ref={formRef} onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-text-muted mb-1">Date</label>
              <input
                type="date"
                value={date}
                max={todayStr()}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 px-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MEALS.map(([key, label]) => (
                <label key={key} className="block">
                  <span className="text-[11px] uppercase tracking-wider text-text-muted">{label}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFiles((f) => ({ ...f, [key]: e.target.files?.[0] || null }))}
                    className="block w-full mt-1 text-[12px] text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-primary file:text-black file:font-semibold file:text-[12px] file:cursor-pointer"
                  />
                </label>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note for your coach (e.g. ate out at lunch)…"
              className="w-full min-h-[64px] p-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary resize-y"
            />
            <Button type="submit" loading={uploading}>Submit Meal Check-in</Button>
          </form>
        </Card.Body>
      </Card>

      {mine.length > 0 && (
        <Card>
          <Card.Header><Card.Title>Recent Meal Check-ins</Card.Title></Card.Header>
          <Card.Body className="space-y-3">
            {mine.map((m) => {
              const st = MEAL_STATUS[m.status] || MEAL_STATUS.PENDING;
              const count = MEAL_KEYS.filter((k) => m[k]).length;
              return (
                <div key={m._id} className="rounded-xl border border-border bg-surface-elevated p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-text-primary">{fmtDay(m.date)}</p>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {MEAL_KEYS.map((k) => m[k] ? (
                      <a key={k} href={m[k].url} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-lg overflow-hidden border border-border block">
                        <img src={m[k].thumbnailUrl} alt={k} className="w-full h-full object-cover" />
                      </a>
                    ) : null)}
                    <span className="text-[11px] text-text-muted">{count} of 4 logged</span>
                  </div>
                  {m.comment && (
                    <p className="mt-2 text-[12.5px] text-text-secondary">
                      <span className="text-text-muted">Coach:</span> {m.comment}
                    </p>
                  )}
                </div>
              );
            })}
          </Card.Body>
        </Card>
      )}

      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />
    </>
  );
};

const PlanNotes = ({ plan }) =>
  plan.foodAvoidances || plan.eatingHabits || plan.notes ? (
    <Card>
      <Card.Header><Card.Title>Notes & Preferences</Card.Title></Card.Header>
      <Card.Body className="space-y-4">
        {plan.foodAvoidances && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-text-muted">Foods to avoid</p>
            <p className="text-sm text-text-primary mt-1 whitespace-pre-wrap">{plan.foodAvoidances}</p>
          </div>
        )}
        {plan.eatingHabits && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-text-muted">Eating habits</p>
            <p className="text-sm text-text-primary mt-1 whitespace-pre-wrap">{plan.eatingHabits}</p>
          </div>
        )}
        {plan.notes && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-text-muted">Coach notes</p>
            <p className="text-sm text-text-primary mt-1 whitespace-pre-wrap">{plan.notes}</p>
          </div>
        )}
      </Card.Body>
    </Card>
  ) : null;

const ClientNutritionPage = () => {
  const local = useMemo(() => localToday(), []);
  const [plan, setPlan] = useState(null);
  const [summary, setSummary] = useState(null);
  const [todayLog, setTodayLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Lightweight refetch of just the daily surfaces (no page skeleton flash) —
  // used after a meal upload and after pulling to refresh. Re-renders the card
  // straight from the refetched payload; no manual macro recompute.
  const refetchToday = useCallback(async () => {
    const [s, logs] = await Promise.all([
      mealLogService.today(local).catch(() => null),
      mealLogService.listMine({ date: local.date }).catch(() => []),
    ]);
    setSummary(s);
    setTodayLog(logs[0] || null);
  }, [local]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [plans] = await Promise.all([nutritionService.listMine(), refetchToday()]);
      setPlan(plans[0] || null); // most recent ACTIVE
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load nutrition plan");
    } finally {
      setLoading(false);
    }
  }, [refetchToday]);

  useEffect(() => { load(); }, [load]);

  // A scheduled (v2) plan drives the macro card + per-meal logging. A flat
  // legacy plan (no schedule) keeps the simple targets view + photo check-in.
  const hasSchedule = (plan?.schedule || []).length > 0;

  // Merge the trainer's per-entry note (not in /today) onto today's meals.
  const entries = todayLog?.entries || [];
  const mealRows = (summary?.meals || []).map((m) => {
    const entry = entries.find((e) => e.mealType === m.mealType);
    return { ...m, note: entry?.note || null };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">My Nutrition</h2>
        <p className="text-sm text-text-secondary mt-1">Daily macros, preferences, and meal logging.</p>
      </div>

      {loading ? (
        <SkeletonDetail />
      ) : error ? (
        <ErrorState title="Couldn't load your nutrition plan" message={error} onRetry={load} />
      ) : !plan ? (
        <>
          <Card>
            <Card.Body>
              <EmptyState
                title="No nutrition plan yet"
                description="Once your coach publishes a plan, your macro targets will appear here."
              />
            </Card.Body>
          </Card>
          <MealCheckinSection />
        </>
      ) : hasSchedule ? (
        <>
          {/* v2 — daily macro card (reviewed-only consumed) + per-meal logging */}
          <NutritionCard summary={summary} />

          <Card>
            <Card.Header>
              <Card.Title>Today&apos;s Meals</Card.Title>
              <Card.Description>
                Upload a photo of each meal. It stays &quot;pending&quot; until your coach reviews it — only reviewed meals count toward your totals above.
              </Card.Description>
            </Card.Header>
            <Card.Body>
              <MealLogList
                meals={mealRows}
                localDate={local.date}
                onLogged={refetchToday}
                pushToast={setToast}
              />
            </Card.Body>
          </Card>

          <PlanNotes plan={plan} />
        </>
      ) : (
        <>
          {/* Legacy flat plan — simple targets + photo check-in */}
          <Card>
            <Card.Header>
              <Card.Title>{plan.planName}</Card.Title>
              <Card.Description>{plan.dietType ? `${plan.dietType} · ` : ""}Active plan from your coach.</Card.Description>
            </Card.Header>
            <Card.Body>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Calories"    value={plan.calories}    unit="kcal" />
                <Stat label="Protein"     value={plan.protein}     unit="g" />
                <Stat label="Carbs"       value={plan.carbs}       unit="g" />
                <Stat label="Fats"        value={plan.fats}        unit="g" />
                <Stat label="Water"       value={plan.waterTarget} unit="L/day" />
                <Stat label="Meals / day" value={plan.mealsPerDay} />
                <Stat label="Cheat meals" value={plan.cheatMeals}  unit="/wk" />
                <Stat label="Diet type"   value={plan.dietType} />
              </div>
            </Card.Body>
          </Card>

          <PlanNotes plan={plan} />
          <MealCheckinSection />
        </>
      )}

      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default ClientNutritionPage;
