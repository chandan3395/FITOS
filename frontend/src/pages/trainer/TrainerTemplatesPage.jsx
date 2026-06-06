import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { SkeletonDetail, ErrorState, Toast } from "../../components/feedback/States";
import workoutTemplateService from "../../services/workoutTemplateService";
import nutritionTemplateService from "../../services/nutritionTemplateService";

// ── shared helpers ───────────────────────────────────────────
const inputClass = "w-full h-9 px-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#333]";
const textareaClass = "w-full min-h-[84px] px-3 py-2 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#333]";

const DAYS = [1, 2, 3, 4, 5, 6, 7];

const BADGE = {
  ACTIVE:   { label: "Active",   cls: "bg-emerald-400/10 text-emerald-300" },
  ARCHIVED: { label: "Archived", cls: "bg-zinc-900 text-zinc-500" },
};
const StatusBadge = ({ status }) => {
  const meta = BADGE[status] || BADGE.ACTIVE;
  return <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${meta.cls}`}>{meta.label}</span>;
};

const toNumber = (v) => (v === "" || v == null) ? undefined : Number(v);

// ─────────────────────────────────────────────────────────────
// WORKOUT TEMPLATES
// ─────────────────────────────────────────────────────────────
const emptyWorkoutDraft = () => ({
  _id: null,
  name: "",
  description: "",
  durationWeeks: 4,
  notes: "",
  status: "ACTIVE",
  exercises: [],
});

const workoutDraftFrom = (t) => ({
  _id: t._id,
  name: t.name || "",
  description: t.description || "",
  durationWeeks: t.durationWeeks || 4,
  notes: t.notes || "",
  status: t.status || "ACTIVE",
  exercises: (t.exercises || []).map((ex, i) => ({
    _id: ex._id,
    name: ex.name || "",
    sets: ex.sets ?? 3,
    reps: ex.reps ?? 10,
    weight: ex.weight ?? 0,
    restSeconds: ex.restSeconds ?? 60,
    dayNumber: ex.dayNumber || 1,
    order: ex.order || i + 1,
    notes: ex.notes || "",
  })),
});

const buildWorkoutPayload = (draft) => {
  const perDay = new Map();
  return {
    name: draft.name,
    description: draft.description || undefined,
    durationWeeks: toNumber(draft.durationWeeks),
    notes: draft.notes || undefined,
    status: draft.status,
    exercises: draft.exercises.map((ex) => {
      const day = toNumber(ex.dayNumber) || 1;
      const nextOrder = (perDay.get(day) || 0) + 1;
      perDay.set(day, nextOrder);
      return {
        _id: ex._id,
        name: ex.name,
        sets: toNumber(ex.sets),
        reps: toNumber(ex.reps),
        weight: toNumber(ex.weight),
        restSeconds: toNumber(ex.restSeconds),
        dayNumber: day,
        order: nextOrder,
        notes: ex.notes || undefined,
      };
    }),
  };
};

const groupByDay = (exercises) => DAYS.map((day) => ({
  day,
  exercises: exercises
    .map((exercise, globalIndex) => ({ exercise, globalIndex }))
    .filter(({ exercise }) => Number(exercise.dayNumber || 1) === day),
}));

const ExerciseRow = ({ exercise, displayNumber, globalIndex, onChange, onRemove }) => (
  <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-text-primary">Exercise {displayNumber}</p>
      <Button size="sm" variant="danger" onClick={() => onRemove(globalIndex)}>Remove</Button>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
      <input className={`${inputClass} sm:col-span-2`} placeholder="Name" value={exercise.name} onChange={(e) => onChange(globalIndex, "name", e.target.value)} />
      <input className={inputClass} type="number" min="1" max="20"  placeholder="Sets" value={exercise.sets} onChange={(e) => onChange(globalIndex, "sets", e.target.value)} />
      <input className={inputClass} type="number" min="1" max="100" placeholder="Reps" value={exercise.reps} onChange={(e) => onChange(globalIndex, "reps", e.target.value)} />
      <input className={inputClass} type="number" min="0" step="0.5" placeholder="Weight" value={exercise.weight} onChange={(e) => onChange(globalIndex, "weight", e.target.value)} />
      <input className={inputClass} type="number" min="0" max="600" placeholder="Rest sec" value={exercise.restSeconds} onChange={(e) => onChange(globalIndex, "restSeconds", e.target.value)} />
    </div>
    <input className={inputClass} placeholder="Notes (optional)" value={exercise.notes} onChange={(e) => onChange(globalIndex, "notes", e.target.value)} />
  </div>
);

const WorkoutTemplatesPanel = ({ pushToast }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState(null);
  const builderRef = useRef(null);
  const [builderSeq, setBuilderSeq] = useState(0);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setList(await workoutTemplateService.list()); }
    catch (e) { setError(e?.response?.data?.message || "Failed to load templates"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (builderSeq === 0 || !builderRef.current) return;
    const node = builderRef.current;
    const frame = requestAnimationFrame(() => {
      const OFFSET = 16;
      const top = node.getBoundingClientRect().top + window.scrollY - OFFSET;
      window.scrollTo({ top, behavior: "smooth" });
      node.querySelector("input, textarea, select")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [builderSeq]);

  const startCreate = () => { setDraft(emptyWorkoutDraft()); setBuilderSeq((n) => n + 1); };
  const startEdit   = (t) => { setDraft(workoutDraftFrom(t)); setBuilderSeq((n) => n + 1); };
  const changeDraft = (k, v) => setDraft((c) => ({ ...c, [k]: v }));
  const changeExercise = (i, k, v) => setDraft((c) => ({
    ...c, exercises: c.exercises.map((ex, j) => j === i ? { ...ex, [k]: v } : ex),
  }));
  const addExercise = (day) => setDraft((c) => ({
    ...c, exercises: [...c.exercises, { name: "", sets: 3, reps: 10, weight: 0, restSeconds: 60, dayNumber: day, order: 0, notes: "" }],
  }));
  const removeExercise = (i) => setDraft((c) => ({ ...c, exercises: c.exercises.filter((_, j) => j !== i) }));

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const payload = buildWorkoutPayload(draft);
      const saved = draft._id
        ? await workoutTemplateService.update(draft._id, payload)
        : await workoutTemplateService.create(payload);
      pushToast({ kind: "success", message: draft._id ? "Template updated" : "Template created" });
      setDraft(workoutDraftFrom(saved));
      await load();
    } catch (err) {
      const errors = err?.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0] : null;
      pushToast({ kind: "error", message: firstError || err?.response?.data?.message || "Save failed" });
    } finally { setSaving(false); }
  };

  const archive = async (t) => {
    if (!confirm(`Archive "${t.name}"?`)) return;
    setActionBusy(t._id);
    try {
      await workoutTemplateService.archive(t._id);
      pushToast({ kind: "success", message: "Template archived" });
      await load();
    } catch (err) { pushToast({ kind: "error", message: err?.response?.data?.message || "Archive failed" }); }
    finally { setActionBusy(null); }
  };
  const remove = async (t) => {
    if (!confirm(`Permanently delete "${t.name}"?`)) return;
    setActionBusy(t._id);
    try {
      await workoutTemplateService.remove(t._id);
      pushToast({ kind: "success", message: "Template deleted" });
      if (draft?._id === t._id) setDraft(null);
      await load();
    } catch (err) { pushToast({ kind: "error", message: err?.response?.data?.message || "Delete failed" }); }
    finally { setActionBusy(null); }
  };
  const duplicate = async (t) => {
    setActionBusy(t._id);
    try {
      const copy = await workoutTemplateService.duplicate(t._id);
      pushToast({ kind: "success", message: "Template duplicated" });
      await load();
      setDraft(workoutDraftFrom(copy));
      setBuilderSeq((n) => n + 1);
    } catch (err) { pushToast({ kind: "error", message: err?.response?.data?.message || "Duplicate failed" }); }
    finally { setActionBusy(null); }
  };

  const groupedDraft = draft ? groupByDay(draft.exercises) : [];

  if (loading) return <SkeletonDetail />;
  if (error) return <ErrorState title="Couldn't load workout templates" message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <Card.Title>Workout Templates</Card.Title>
              <Card.Description>Reusable blueprints. Editing a template here never touches plans already assigned to clients.</Card.Description>
            </div>
            <Button size="sm" onClick={startCreate}>Create Template</Button>
          </div>
        </Card.Header>
        <Card.Body>
          {list.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-border rounded-xl">
              <p className="text-base font-semibold text-text-primary">No workout templates yet</p>
              <p className="text-sm text-text-secondary mt-1">Build the first one to get started.</p>
              <Button size="sm" className="mt-4" onClick={startCreate}>Create Template</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((t) => {
                const busy = actionBusy === t._id;
                return (
                  <div key={t._id} className="rounded-lg border border-border p-4 bg-surface-elevated flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                        <StatusBadge status={t.status} />
                      </div>
                      <p className="text-[12px] text-text-secondary mt-1">
                        {t.description || "No description"} · {t.durationWeeks || "—"} weeks · {(t.exercises || []).length} exercises
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => startEdit(t)}>Edit</Button>
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => duplicate(t)}>Duplicate</Button>
                      {t.status !== "ARCHIVED" && (
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => archive(t)}>Archive</Button>
                      )}
                      <Button size="sm" variant="danger" disabled={busy} onClick={() => remove(t)}>Delete</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card.Body>
      </Card>

      {draft && (
        <div ref={builderRef}>
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <Card.Title>{draft._id ? "Edit Workout Template" : "Create Workout Template"}</Card.Title>
                <Card.Description>Structure by day, save the template, then assign it to clients (assignment lands in a later pass).</Card.Description>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Close</Button>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
              <label className="sm:col-span-2">
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Template name</span>
                <input className={`${inputClass} mt-1`} value={draft.name} onChange={(e) => changeDraft("name", e.target.value)} placeholder="Hypertrophy 6-Week" />
              </label>
              <label>
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Duration weeks</span>
                <input className={`${inputClass} mt-1`} type="number" min="1" max="52" value={draft.durationWeeks} onChange={(e) => changeDraft("durationWeeks", e.target.value)} />
              </label>
              <label>
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Status</span>
                <div className="mt-2"><StatusBadge status={draft.status} /></div>
              </label>
              <label className="sm:col-span-4">
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Description</span>
                <input className={`${inputClass} mt-1`} value={draft.description} onChange={(e) => changeDraft("description", e.target.value)} placeholder="Short description trainees will see when assigned" />
              </label>
              <label className="sm:col-span-4">
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Notes</span>
                <textarea className={`${textareaClass} mt-1`} value={draft.notes} onChange={(e) => changeDraft("notes", e.target.value)} placeholder="Coaching notes for this template" />
              </label>
            </div>

            <div className="space-y-3">
              {groupedDraft.map(({ day, exercises }) => (
                <div key={day} className="rounded-xl border border-border bg-surface-elevated p-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold text-text-primary">Day {day}</p>
                    <Button size="sm" variant="secondary" onClick={() => addExercise(day)}>Add Exercise</Button>
                  </div>
                  {exercises.length === 0 ? (
                    <p className="text-sm text-text-muted py-2">No exercises for Day {day}.</p>
                  ) : (
                    <div className="space-y-2">
                      {exercises.map(({ exercise, globalIndex }, dayIndex) => (
                        <ExerciseRow
                          key={exercise._id || `${day}-${globalIndex}`}
                          exercise={exercise}
                          displayNumber={dayIndex + 1}
                          globalIndex={globalIndex}
                          onChange={changeExercise}
                          onRemove={removeExercise}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              {draft.status !== "ARCHIVED" && (
                <Button variant="ghost" onClick={() => { changeDraft("status", "ARCHIVED"); }}>Mark Archived</Button>
              )}
              {draft.status === "ARCHIVED" && (
                <Button variant="ghost" onClick={() => { changeDraft("status", "ACTIVE"); }}>Restore Active</Button>
              )}
              <Button loading={saving} onClick={save}>{draft._id ? "Save Changes" : "Create Template"}</Button>
            </div>
          </Card.Body>
        </Card>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// NUTRITION TEMPLATES
// ─────────────────────────────────────────────────────────────
const DIETS = ["Omnivore", "Vegetarian", "Vegan", "Eggetarian", "Keto", "Intermittent Fasting"];

const emptyNutritionDraft = () => ({
  _id: null, name: "", description: "", notes: "", status: "ACTIVE",
  calories: "", protein: "", carbs: "", fats: "",
  waterTarget: "", mealsPerDay: "", cheatMeals: "",
  dietType: "", foodRestrictions: "", eatingHabits: "",
});

const nutritionDraftFrom = (t) => ({
  _id: t._id,
  name: t.name || "",
  description: t.description || "",
  notes: t.notes || "",
  status: t.status || "ACTIVE",
  calories: t.calories ?? "",
  protein: t.protein ?? "",
  carbs: t.carbs ?? "",
  fats: t.fats ?? "",
  waterTarget: t.waterTarget ?? "",
  mealsPerDay: t.mealsPerDay ?? "",
  cheatMeals: t.cheatMeals ?? "",
  dietType: t.dietType ?? "",
  foodRestrictions: t.foodRestrictions ?? "",
  eatingHabits: t.eatingHabits ?? "",
});

const buildNutritionPayload = (d) => ({
  name: d.name,
  description: d.description || undefined,
  notes: d.notes || undefined,
  status: d.status,
  calories: toNumber(d.calories),
  protein: toNumber(d.protein),
  carbs: toNumber(d.carbs),
  fats: toNumber(d.fats),
  waterTarget: toNumber(d.waterTarget),
  mealsPerDay: toNumber(d.mealsPerDay),
  cheatMeals: toNumber(d.cheatMeals),
  dietType: d.dietType || undefined,
  foodRestrictions: d.foodRestrictions || undefined,
  eatingHabits: d.eatingHabits || undefined,
});

const NutritionTemplatesPanel = ({ pushToast }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState(null);
  const builderRef = useRef(null);
  const [builderSeq, setBuilderSeq] = useState(0);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setList(await nutritionTemplateService.list()); }
    catch (e) { setError(e?.response?.data?.message || "Failed to load templates"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (builderSeq === 0 || !builderRef.current) return;
    const node = builderRef.current;
    const frame = requestAnimationFrame(() => {
      const top = node.getBoundingClientRect().top + window.scrollY - 16;
      window.scrollTo({ top, behavior: "smooth" });
      node.querySelector("input, textarea, select")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [builderSeq]);

  const startCreate = () => { setDraft(emptyNutritionDraft()); setBuilderSeq((n) => n + 1); };
  const startEdit   = (t) => { setDraft(nutritionDraftFrom(t)); setBuilderSeq((n) => n + 1); };
  const changeDraft = (k, v) => setDraft((c) => ({ ...c, [k]: v }));

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const payload = buildNutritionPayload(draft);
      const saved = draft._id
        ? await nutritionTemplateService.update(draft._id, payload)
        : await nutritionTemplateService.create(payload);
      pushToast({ kind: "success", message: draft._id ? "Template updated" : "Template created" });
      setDraft(nutritionDraftFrom(saved));
      await load();
    } catch (err) {
      const errors = err?.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0] : null;
      pushToast({ kind: "error", message: firstError || err?.response?.data?.message || "Save failed" });
    } finally { setSaving(false); }
  };
  const archive = async (t) => {
    if (!confirm(`Archive "${t.name}"?`)) return;
    setActionBusy(t._id);
    try { await nutritionTemplateService.archive(t._id); pushToast({ kind: "success", message: "Template archived" }); await load(); }
    catch (err) { pushToast({ kind: "error", message: err?.response?.data?.message || "Archive failed" }); }
    finally { setActionBusy(null); }
  };
  const remove = async (t) => {
    if (!confirm(`Permanently delete "${t.name}"?`)) return;
    setActionBusy(t._id);
    try { await nutritionTemplateService.remove(t._id); pushToast({ kind: "success", message: "Template deleted" }); if (draft?._id === t._id) setDraft(null); await load(); }
    catch (err) { pushToast({ kind: "error", message: err?.response?.data?.message || "Delete failed" }); }
    finally { setActionBusy(null); }
  };
  const duplicate = async (t) => {
    setActionBusy(t._id);
    try {
      const copy = await nutritionTemplateService.duplicate(t._id);
      pushToast({ kind: "success", message: "Template duplicated" });
      await load();
      setDraft(nutritionDraftFrom(copy));
      setBuilderSeq((n) => n + 1);
    } catch (err) { pushToast({ kind: "error", message: err?.response?.data?.message || "Duplicate failed" }); }
    finally { setActionBusy(null); }
  };

  if (loading) return <SkeletonDetail />;
  if (error) return <ErrorState title="Couldn't load nutrition templates" message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <Card.Title>Nutrition Templates</Card.Title>
              <Card.Description>Reusable macro blueprints. Edits here never touch plans already assigned to clients.</Card.Description>
            </div>
            <Button size="sm" onClick={startCreate}>Create Template</Button>
          </div>
        </Card.Header>
        <Card.Body>
          {list.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-border rounded-xl">
              <p className="text-base font-semibold text-text-primary">No nutrition templates yet</p>
              <p className="text-sm text-text-secondary mt-1">Build the first one to get started.</p>
              <Button size="sm" className="mt-4" onClick={startCreate}>Create Template</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((t) => {
                const busy = actionBusy === t._id;
                return (
                  <div key={t._id} className="rounded-lg border border-border p-4 bg-surface-elevated flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                        <StatusBadge status={t.status} />
                      </div>
                      <p className="text-[12px] text-text-secondary mt-1">
                        {t.calories != null ? `${t.calories} kcal` : "No calorie target"}
                        {t.dietType ? ` · ${t.dietType}` : ""}
                        {t.mealsPerDay != null ? ` · ${t.mealsPerDay} meals/day` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => startEdit(t)}>Edit</Button>
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => duplicate(t)}>Duplicate</Button>
                      {t.status !== "ARCHIVED" && (
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => archive(t)}>Archive</Button>
                      )}
                      <Button size="sm" variant="danger" disabled={busy} onClick={() => remove(t)}>Delete</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card.Body>
      </Card>

      {draft && (
        <div ref={builderRef}>
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <Card.Title>{draft._id ? "Edit Nutrition Template" : "Create Nutrition Template"}</Card.Title>
                <Card.Description>Set targets and preferences once; assign to clients later.</Card.Description>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Close</Button>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
              <label className="sm:col-span-2">
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Template name</span>
                <input className={`${inputClass} mt-1`} value={draft.name} onChange={(e) => changeDraft("name", e.target.value)} placeholder="Cutting Template — 2200" />
              </label>
              <label>
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Status</span>
                <div className="mt-2"><StatusBadge status={draft.status} /></div>
              </label>
              <label>
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Diet type</span>
                <select className={`${inputClass} mt-1`} value={draft.dietType} onChange={(e) => changeDraft("dietType", e.target.value)}>
                  <option value="">—</option>
                  {DIETS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              <label className="sm:col-span-4">
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Description</span>
                <input className={`${inputClass} mt-1`} value={draft.description} onChange={(e) => changeDraft("description", e.target.value)} placeholder="Short description trainees will see when assigned" />
              </label>
            </div>

            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted mb-2">Daily Targets</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <label><span className="text-[11px] uppercase tracking-wider text-text-muted">Calories (kcal)</span><input className={`${inputClass} mt-1`} type="number" min="800" max="6000" value={draft.calories} onChange={(e) => changeDraft("calories", e.target.value)} /></label>
              <label><span className="text-[11px] uppercase tracking-wider text-text-muted">Protein (g)</span><input className={`${inputClass} mt-1`} type="number" min="20" max="500" value={draft.protein} onChange={(e) => changeDraft("protein", e.target.value)} /></label>
              <label><span className="text-[11px] uppercase tracking-wider text-text-muted">Carbs (g)</span><input className={`${inputClass} mt-1`} type="number" min="20" max="1000" value={draft.carbs} onChange={(e) => changeDraft("carbs", e.target.value)} /></label>
              <label><span className="text-[11px] uppercase tracking-wider text-text-muted">Fats (g)</span><input className={`${inputClass} mt-1`} type="number" min="10" max="300" value={draft.fats} onChange={(e) => changeDraft("fats", e.target.value)} /></label>
              <label><span className="text-[11px] uppercase tracking-wider text-text-muted">Water (L/day)</span><input className={`${inputClass} mt-1`} type="number" min="0.5" max="10" step="0.1" value={draft.waterTarget} onChange={(e) => changeDraft("waterTarget", e.target.value)} /></label>
              <label><span className="text-[11px] uppercase tracking-wider text-text-muted">Meals / day</span><input className={`${inputClass} mt-1`} type="number" min="1" max="8" value={draft.mealsPerDay} onChange={(e) => changeDraft("mealsPerDay", e.target.value)} /></label>
              <label><span className="text-[11px] uppercase tracking-wider text-text-muted">Cheat meals / week</span><input className={`${inputClass} mt-1`} type="number" min="0" max="7" value={draft.cheatMeals} onChange={(e) => changeDraft("cheatMeals", e.target.value)} /></label>
            </div>

            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted mb-2">Restrictions & Habits</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <label><span className="text-[11px] uppercase tracking-wider text-text-muted">Food restrictions</span><input className={`${inputClass} mt-1`} value={draft.foodRestrictions} onChange={(e) => changeDraft("foodRestrictions", e.target.value)} placeholder="Shellfish, broccoli" /></label>
              <label><span className="text-[11px] uppercase tracking-wider text-text-muted">Eating habits guidance</span><textarea className={`${textareaClass} mt-1`} value={draft.eatingHabits} onChange={(e) => changeDraft("eatingHabits", e.target.value)} placeholder="Meal timing, structure…" /></label>
            </div>

            <label className="block mb-1">
              <span className="text-[11px] uppercase tracking-wider text-text-muted">Template notes</span>
              <textarea className={`${textareaClass} mt-1`} value={draft.notes} onChange={(e) => changeDraft("notes", e.target.value)} placeholder="Coaching notes for this template" />
            </label>

            <div className="mt-5 flex items-center justify-end gap-2">
              {draft.status !== "ARCHIVED" && <Button variant="ghost" onClick={() => changeDraft("status", "ARCHIVED")}>Mark Archived</Button>}
              {draft.status === "ARCHIVED" && <Button variant="ghost" onClick={() => changeDraft("status", "ACTIVE")}>Restore Active</Button>}
              <Button loading={saving} onClick={save}>{draft._id ? "Save Changes" : "Create Template"}</Button>
            </div>
          </Card.Body>
        </Card>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id: "workout",   label: "Workout Templates" },
  { id: "nutrition", label: "Nutrition Templates" },
];

const TrainerTemplatesPage = () => {
  const [tab, setTab] = useState("workout");
  const [toast, setToast] = useState(null);
  const pushToast = useMemo(() => (t) => setToast(t), []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">Templates</h2>
        <p className="text-sm text-text-secondary mt-1">Build reusable workout and nutrition blueprints.</p>
      </div>

      <div className="border-b border-border">
        <div className="flex items-center gap-1 -mb-px">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                "h-10 px-4 text-[13.5px] font-medium border-b-2 transition-colors whitespace-nowrap",
                tab === t.id
                  ? "border-primary text-text-primary"
                  : "border-transparent text-text-muted hover:text-text-primary",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "workout"   && <WorkoutTemplatesPanel   pushToast={pushToast} />}
      {tab === "nutrition" && <NutritionTemplatesPanel pushToast={pushToast} />}

      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default TrainerTemplatesPage;
