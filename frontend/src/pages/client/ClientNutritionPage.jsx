import { useCallback, useEffect, useRef, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { EmptyState, ErrorState, SkeletonDetail, Toast } from "../../components/feedback/States";
import nutritionService from "../../services/nutritionService";
import mealCheckinService from "../../services/mealCheckinService";

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

const ClientNutritionPage = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setPlans(await nutritionService.listMine()); }
    catch (e) { setError(e?.response?.data?.message || "Failed to load nutrition plan"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Most recent first; backend already filters ACTIVE.
  const plan = plans[0] || null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">My Nutrition</h2>
        <p className="text-sm text-text-secondary mt-1">Daily macros, preferences, and meal check-ins.</p>
      </div>

      {/* Plan */}
      {loading ? (
        <SkeletonDetail />
      ) : error ? (
        <ErrorState title="Couldn't load your nutrition plan" message={error} onRetry={load} />
      ) : !plan ? (
        <Card>
          <Card.Body>
            <EmptyState
              title="No nutrition plan yet"
              description="Once your coach publishes a plan, your macro targets will appear here."
            />
          </Card.Body>
        </Card>
      ) : (
        <>
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

          {(plan.foodAvoidances || plan.eatingHabits || plan.notes) && (
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
          )}
        </>
      )}

      {/* Daily meal check-in — always available so the client can log adherence. */}
      <MealCheckinSection />
    </div>
  );
};

export default ClientNutritionPage;
