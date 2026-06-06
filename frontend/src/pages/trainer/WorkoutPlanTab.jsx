import { useCallback, useEffect, useRef, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { SkeletonDetail, ErrorState, Toast } from "../../components/feedback/States";
import workoutService from "../../services/workoutService";
import clientService from "../../services/clientService";

const inputClass = "w-full h-9 px-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#333]";
const textareaClass = "w-full min-h-[84px] px-3 py-2 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#333]";
const DAYS = [1, 2, 3, 4, 5, 6, 7];

const emptyDraft = () => ({
  _id: null,
  planName: "",
  goal: "",
  durationWeeks: 4,
  notes: "",
  status: "DRAFT",
  exercises: []
});

const draftFromPlan = (plan) => ({
  _id: plan._id,
  planName: plan.planName || "",
  goal: plan.goal || "",
  durationWeeks: plan.durationWeeks || 4,
  notes: plan.notes || "",
  status: plan.status || "DRAFT",
  exercises: (plan.exercises || []).map((exercise, index) => ({
    _id: exercise._id,
    name: exercise.name || "",
    sets: exercise.sets ?? 3,
    reps: exercise.reps ?? 10,
    weight: exercise.weight ?? 0,
    restSeconds: exercise.restSeconds ?? 60,
    dayNumber: exercise.dayNumber || 1,
    order: exercise.order || index + 1,
    notes: exercise.notes || ""
  }))
});

const toNumber = (value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  return Number(value);
};

/**
 * Build the persistence payload. Order is regenerated per-day from the
 * exercise's position within its day's filtered list, so numbering is
 * always derived from array index — never a stale stored value, never a
 * duplicate across days.
 */
const preparePayload = (draft, status) => {
  const perDayCounter = new Map();
  return {
    planName: draft.planName,
    goal: draft.goal || undefined,
    durationWeeks: toNumber(draft.durationWeeks),
    notes: draft.notes || undefined,
    status,
    exercises: draft.exercises.map((exercise) => {
      const day = toNumber(exercise.dayNumber) || 1;
      const nextOrder = (perDayCounter.get(day) || 0) + 1;
      perDayCounter.set(day, nextOrder);
      return {
        _id: exercise._id,
        name: exercise.name,
        sets: toNumber(exercise.sets),
        reps: toNumber(exercise.reps),
        weight: toNumber(exercise.weight),
        restSeconds: toNumber(exercise.restSeconds),
        dayNumber: day,
        order: nextOrder,
        notes: exercise.notes || undefined
      };
    })
  };
};

const fmtDate = (iso) => iso
  ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  : "-";

const groupByDay = (exercises) => DAYS.map((day) => ({
  day,
  exercises: exercises
    .map((exercise, globalIndex) => ({ exercise, globalIndex }))
    .filter(({ exercise }) => Number(exercise.dayNumber || 1) === day)
}));

const BADGE_STYLE = {
  DRAFT:    { label: "Draft",     cls: "bg-zinc-800 text-zinc-300" },
  ACTIVE:   { label: "Published", cls: "bg-emerald-400/10 text-emerald-300" },
  ARCHIVED: { label: "Archived",  cls: "bg-zinc-900 text-zinc-500" },
};

const PlanBadge = ({ status }) => {
  const meta = BADGE_STYLE[status] || BADGE_STYLE.DRAFT;
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${meta.cls}`}>
      {meta.label}
    </span>
  );
};

const ExerciseEditor = ({ exercise, displayNumber, globalIndex, canMoveUp, canMoveDown, onChange, onRemove, onDuplicate, onMove }) => (
  <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-text-primary">Exercise {displayNumber}</p>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" disabled={!canMoveUp} onClick={() => onMove(globalIndex, -1)}>Up</Button>
        <Button size="sm" variant="ghost" disabled={!canMoveDown} onClick={() => onMove(globalIndex, 1)}>Down</Button>
        <Button size="sm" variant="secondary" onClick={() => onDuplicate(globalIndex)}>Duplicate</Button>
        <Button size="sm" variant="danger" onClick={() => onRemove(globalIndex)}>Remove</Button>
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
      <label className="sm:col-span-2">
        <span className="text-[11px] uppercase tracking-wider text-text-muted">Name</span>
        <input value={exercise.name} onChange={(e) => onChange(globalIndex, "name", e.target.value)} className={`${inputClass} mt-1`} placeholder="Bench press" />
      </label>
      <label>
        <span className="text-[11px] uppercase tracking-wider text-text-muted">Sets</span>
        <input type="number" min="1" max="20" value={exercise.sets} onChange={(e) => onChange(globalIndex, "sets", e.target.value)} className={`${inputClass} mt-1`} />
      </label>
      <label>
        <span className="text-[11px] uppercase tracking-wider text-text-muted">Reps</span>
        <input type="number" min="1" max="100" value={exercise.reps} onChange={(e) => onChange(globalIndex, "reps", e.target.value)} className={`${inputClass} mt-1`} />
      </label>
      <label>
        <span className="text-[11px] uppercase tracking-wider text-text-muted">Weight</span>
        <input type="number" min="0" step="0.5" value={exercise.weight} onChange={(e) => onChange(globalIndex, "weight", e.target.value)} className={`${inputClass} mt-1`} />
      </label>
      <label>
        <span className="text-[11px] uppercase tracking-wider text-text-muted">Rest sec</span>
        <input type="number" min="0" max="600" value={exercise.restSeconds} onChange={(e) => onChange(globalIndex, "restSeconds", e.target.value)} className={`${inputClass} mt-1`} />
      </label>
    </div>
    <textarea value={exercise.notes} onChange={(e) => onChange(globalIndex, "notes", e.target.value)} className={textareaClass} placeholder="Coaching notes, tempo, substitutions" />
  </div>
);

/**
 * Inline picker for the Reassign action. Lazy-loads the trainer's clients
 * and excludes the current owner so reassign cannot no-op.
 */
const ReassignPicker = ({ currentClientId, onCancel, onConfirm, busy }) => {
  const [options, setOptions] = useState([]);
  const [target, setTarget]   = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    clientService.list()
      .then((items) => {
        if (cancelled) return;
        const filtered = (items || []).filter(
          (c) => String(c._id) !== String(currentClientId) && c.status !== "ARCHIVED"
        );
        setOptions(filtered);
      })
      .catch(() => setOptions([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [currentClientId]);

  return (
    <div className="mt-2 rounded-lg border border-border bg-surface p-3 flex items-center gap-2 flex-wrap">
      <span className="text-[11px] uppercase tracking-wider text-text-muted">Reassign to</span>
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        disabled={loading || options.length === 0 || busy}
        className="h-9 px-2 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-[#333]"
      >
        <option value="">{loading ? "Loading…" : options.length === 0 ? "No other clients" : "Pick a client"}</option>
        {options.map((c) => (
          <option key={c._id} value={c._id}>{c.name}</option>
        ))}
      </select>
      <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
      <Button size="sm" onClick={() => target && onConfirm(target)} disabled={!target || busy} loading={busy}>
        Reassign
      </Button>
    </div>
  );
};

const WorkoutPlanTab = ({ clientId }) => {
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [completions, setCompletions] = useState([]);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [reassignPlanId, setReassignPlanId] = useState(null);
  const [actionBusy, setActionBusy] = useState(null); // planId currently mutating
  // `builderSeq` increments on every Create or Edit click so the scroll +
  // focus effect re-runs even when the user re-opens the same draft, but
  // *not* on incidental draft mutations (saves, status flips, field edits).
  const [builderSeq, setBuilderSeq] = useState(0);
  const builderRef = useRef(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextPlans = await workoutService.listForClient(clientId);
      setPlans(nextPlans);
      setSelectedPlanId((current) => current || nextPlans[0]?._id || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load workout plans");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const selectedPlan = plans.find((plan) => plan._id === selectedPlanId) || plans[0] || null;

  useEffect(() => {
    let cancelled = false;
    if (!selectedPlan?._id) {
      setCompletions([]);
      return undefined;
    }

    setCompletionLoading(true);
    workoutService.completions(selectedPlan._id)
      .then((items) => { if (!cancelled) setCompletions(items); })
      .catch(() => { if (!cancelled) setCompletions([]); })
      .finally(() => { if (!cancelled) setCompletionLoading(false); });

    return () => { cancelled = true; };
  }, [selectedPlan?._id]);

  const startCreate = () => {
    setDraft(emptyDraft());
    setBuilderSeq((n) => n + 1);
  };

  const startEdit = (plan) => {
    setSelectedPlanId(plan._id);
    setDraft(draftFromPlan(plan));
    setBuilderSeq((n) => n + 1);
  };

  // Smooth-scroll to the builder and focus its first editable field whenever
  // the user explicitly opens it. We key on `builderSeq` so saves and
  // status flips don't yank the page around.
  useEffect(() => {
    if (builderSeq === 0) return;
    const node = builderRef.current;
    if (!node) return;
    const frame = requestAnimationFrame(() => {
      const HEADER_OFFSET = 16; // breathing room from the top edge
      const top = node.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      window.scrollTo({ top, behavior: "smooth" });
      const firstField = node.querySelector("input, textarea, select");
      // preventScroll keeps focus from re-scrolling and fighting the smooth
      // scroll above.
      firstField?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [builderSeq]);

  const changeDraft = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const changeExercise = (index, field, value) => {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, i) => (
        i === index ? { ...exercise, [field]: value } : exercise
      ))
    }));
  };

  const addExercise = (dayNumber) => {
    setDraft((current) => ({
      ...current,
      exercises: [
        ...current.exercises,
        {
          name: "",
          sets: 3,
          reps: 10,
          weight: 0,
          restSeconds: 60,
          dayNumber,
          // Stored `order` is regenerated on save (preparePayload), so this
          // placeholder is purely informational until the next save.
          order: current.exercises.filter((exercise) => Number(exercise.dayNumber) === dayNumber).length + 1,
          notes: ""
        }
      ]
    }));
  };

  const removeExercise = (index) => {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.filter((_, i) => i !== index)
    }));
  };

  const duplicateExercise = (index) => {
    setDraft((current) => {
      const exercise = current.exercises[index];
      const copy = { ...exercise, _id: undefined, name: `${exercise.name || "Exercise"} Copy` };
      const next = [...current.exercises];
      next.splice(index + 1, 0, copy);
      return { ...current, exercises: next };
    });
  };

  const moveExercise = (index, direction) => {
    setDraft((current) => {
      const exercise = current.exercises[index];
      const sameDayIndexes = current.exercises
        .map((item, itemIndex) => ({ item, itemIndex }))
        .filter(({ item }) => Number(item.dayNumber) === Number(exercise.dayNumber))
        .map(({ itemIndex }) => itemIndex);
      const dayPosition = sameDayIndexes.indexOf(index);
      const targetIndex = sameDayIndexes[dayPosition + direction];
      if (targetIndex === undefined) return current;
      const next = [...current.exercises];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return { ...current, exercises: next };
    });
  };

  const saveDraft = async (status) => {
    if (!draft) return;
    if (status === "ACTIVE" && draft.exercises.length === 0) {
      setToast({ kind: "error", message: "Add at least one exercise before publishing" });
      return;
    }
    setSaving(true);
    try {
      const payload = preparePayload(draft, status);
      const saved = draft._id
        ? await workoutService.update(draft._id, payload)
        : await workoutService.create(clientId, payload);
      setToast({
        kind: "success",
        message: status === "ACTIVE" ? "Workout plan published"
               : status === "ARCHIVED" ? "Workout plan archived"
               : "Workout draft saved"
      });
      setDraft(draftFromPlan(saved));
      await loadPlans();
      setSelectedPlanId(saved._id);
    } catch (err) {
      const errors = err?.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0] : null;
      setToast({ kind: "error", message: firstError || err?.response?.data?.message || "Failed to save workout plan" });
    } finally {
      setSaving(false);
    }
  };

  const publishPlan = async (plan) => {
    setActionBusy(plan._id);
    try {
      const updated = await workoutService.publish(plan._id);
      setToast({ kind: "success", message: "Workout plan published" });
      if (draft?._id === plan._id) setDraft(draftFromPlan(updated));
      await loadPlans();
    } catch (err) {
      setToast({ kind: "error", message: err?.response?.data?.message || "Failed to publish plan" });
    } finally {
      setActionBusy(null);
    }
  };

  const archivePlan = async (plan) => {
    if (!confirm(`Archive "${plan.planName}"?`)) return;
    setActionBusy(plan._id);
    try {
      const archived = await workoutService.archive(plan._id);
      setToast({ kind: "success", message: "Workout plan archived" });
      if (draft?._id === plan._id) setDraft(draftFromPlan(archived));
      await loadPlans();
    } catch (err) {
      setToast({ kind: "error", message: err?.response?.data?.message || "Failed to archive plan" });
    } finally {
      setActionBusy(null);
    }
  };

  const deletePlan = async (plan) => {
    if (!confirm(`Permanently delete "${plan.planName}"? This cannot be undone.`)) return;
    setActionBusy(plan._id);
    try {
      await workoutService.remove(plan._id);
      setToast({ kind: "success", message: "Workout plan deleted" });
      if (draft?._id === plan._id) setDraft(null);
      if (selectedPlanId === plan._id) setSelectedPlanId(null);
      await loadPlans();
    } catch (err) {
      setToast({ kind: "error", message: err?.response?.data?.message || "Failed to delete plan" });
    } finally {
      setActionBusy(null);
    }
  };

  const duplicatePlan = async (plan) => {
    setActionBusy(plan._id);
    try {
      const copy = await workoutService.duplicate(clientId, plan);
      setToast({ kind: "success", message: "Workout plan duplicated" });
      await loadPlans();
      setSelectedPlanId(copy._id);
      setDraft(draftFromPlan(copy));
    } catch (err) {
      setToast({ kind: "error", message: err?.response?.data?.message || "Failed to duplicate plan" });
    } finally {
      setActionBusy(null);
    }
  };

  const reassignPlan = async (plan, targetClientId) => {
    setActionBusy(plan._id);
    try {
      await workoutService.reassign(plan._id, targetClientId);
      setToast({ kind: "success", message: "Plan reassigned (DRAFT created on the new client)" });
      setReassignPlanId(null);
    } catch (err) {
      setToast({ kind: "error", message: err?.response?.data?.message || "Failed to reassign plan" });
    } finally {
      setActionBusy(null);
    }
  };

  if (loading) return <SkeletonDetail />;
  if (error) return <ErrorState title="Couldn't load workout plans" message={error} onRetry={loadPlans} />;

  const groupedDraft = draft ? groupByDay(draft.exercises) : [];
  const completionMap = new Map(completions.map((item) => [String(item.exerciseId), item]));
  const selectedExercises = selectedPlan?.exercises || [];
  const completedCount = selectedExercises.filter((exercise) => completionMap.has(String(exercise._id))).length;

  return (
    <div className="space-y-4">
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <Card.Title>Workout Plans</Card.Title>
              <Card.Description>Draft, publish, edit, archive, delete, or reassign client workout plans.</Card.Description>
            </div>
            <Button size="sm" onClick={startCreate}>Create Plan</Button>
          </div>
        </Card.Header>
        <Card.Body>
          {plans.length === 0 ? (
            <div className="py-10 flex flex-col items-center text-center border border-dashed border-border rounded-xl">
              <p className="text-base font-semibold text-text-primary">No workout plans yet</p>
              <p className="text-sm text-text-secondary mt-1 max-w-sm">Create the first plan to get started.</p>
              <Button size="sm" className="mt-4" onClick={startCreate}>Create Plan</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map((plan) => {
                const busy = actionBusy === plan._id;
                return (
                  <div key={plan._id} className={[
                    "rounded-lg border p-4 bg-surface-elevated",
                    selectedPlan?._id === plan._id ? "border-primary/60" : "border-border"
                  ].join(" ")}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <button type="button" onClick={() => setSelectedPlanId(plan._id)} className="text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-text-primary">{plan.planName}</p>
                          <PlanBadge status={plan.status} />
                        </div>
                        <p className="text-[12px] text-text-secondary mt-1">
                          {plan.goal || "No goal set"} · {plan.durationWeeks || "-"} weeks · {(plan.exercises || []).length} exercises
                        </p>
                      </button>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button size="sm" variant="secondary" onClick={() => startEdit(plan)} disabled={busy}>Edit</Button>
                        <Button size="sm" variant="secondary" onClick={() => duplicatePlan(plan)} disabled={busy}>Duplicate</Button>
                        {plan.status !== "ACTIVE" && (
                          <Button size="sm" onClick={() => publishPlan(plan)} disabled={busy || (plan.exercises || []).length === 0}>Publish</Button>
                        )}
                        {plan.status !== "ARCHIVED" && (
                          <Button size="sm" variant="secondary" onClick={() => archivePlan(plan)} disabled={busy}>Archive</Button>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => setReassignPlanId(reassignPlanId === plan._id ? null : plan._id)} disabled={busy}>
                          {reassignPlanId === plan._id ? "Close" : "Reassign"}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => deletePlan(plan)} disabled={busy}>Delete</Button>
                      </div>
                    </div>
                    {reassignPlanId === plan._id && (
                      <ReassignPicker
                        currentClientId={clientId}
                        busy={busy}
                        onCancel={() => setReassignPlanId(null)}
                        onConfirm={(targetId) => reassignPlan(plan, targetId)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card.Body>
      </Card>

      {selectedPlan && (
        <Card>
          <Card.Header>
            <Card.Title>Completion History</Card.Title>
            <Card.Description>
              {completedCount} of {selectedExercises.length} exercises completed on {selectedPlan.planName}.
            </Card.Description>
          </Card.Header>
          <Card.Body>
            {completionLoading ? (
              <p className="text-sm text-text-muted">Loading history...</p>
            ) : completions.length === 0 ? (
              <p className="text-sm text-text-muted">No completed exercises yet.</p>
            ) : (
              <div className="space-y-2">
                {completions.map((completion) => {
                  const exercise = selectedExercises.find((item) => String(item._id) === String(completion.exerciseId));
                  return (
                    <div key={completion._id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-elevated border border-border px-3 py-2">
                      <p className="text-sm text-text-primary">{exercise?.name || "Exercise"}</p>
                      <p className="text-[12px] text-text-muted">{fmtDate(completion.completedAt)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {draft && (
        <div ref={builderRef}>
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <Card.Title>{draft._id ? "Edit Workout Plan" : "Create Workout Plan"}</Card.Title>
                <Card.Description>Build the weekly structure by day, then save draft or publish.</Card.Description>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Close Builder</Button>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
              <label className="sm:col-span-2">
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Plan name</span>
                <input value={draft.planName} onChange={(e) => changeDraft("planName", e.target.value)} className={`${inputClass} mt-1`} placeholder="Hypertrophy Block" />
              </label>
              <label>
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Duration weeks</span>
                <input type="number" min="1" max="52" value={draft.durationWeeks} onChange={(e) => changeDraft("durationWeeks", e.target.value)} className={`${inputClass} mt-1`} />
              </label>
              <label>
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Status</span>
                <div className="mt-2"><PlanBadge status={draft.status} /></div>
              </label>
              <label className="sm:col-span-2">
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Goal</span>
                <input value={draft.goal} onChange={(e) => changeDraft("goal", e.target.value)} className={`${inputClass} mt-1`} placeholder="Build strength while improving mobility" />
              </label>
              <label className="sm:col-span-2">
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Notes</span>
                <textarea value={draft.notes} onChange={(e) => changeDraft("notes", e.target.value)} className={`${textareaClass} mt-1`} placeholder="Plan-level coaching notes" />
              </label>
            </div>

            <div className="space-y-4">
              {groupedDraft.map(({ day, exercises }) => (
                <div key={day} className="rounded-xl border border-border bg-surface-elevated p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-sm font-semibold text-text-primary">Day {day}</p>
                    <Button size="sm" variant="secondary" onClick={() => addExercise(day)}>Add Exercise</Button>
                  </div>
                  {exercises.length === 0 ? (
                    <p className="text-sm text-text-muted py-3">No exercises assigned for Day {day}.</p>
                  ) : (
                    <div className="space-y-3">
                      {exercises.map(({ exercise, globalIndex }, dayIndex) => (
                        <ExerciseEditor
                          key={exercise._id || `${day}-${globalIndex}`}
                          exercise={exercise}
                          /* Per-day numbering, restarting at 1 for each day */
                          displayNumber={dayIndex + 1}
                          globalIndex={globalIndex}
                          canMoveUp={dayIndex > 0}
                          canMoveDown={dayIndex < exercises.length - 1}
                          onChange={changeExercise}
                          onRemove={removeExercise}
                          onDuplicate={duplicateExercise}
                          onMove={moveExercise}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 flex-wrap">
              {draft.status !== "ARCHIVED" && (
                <Button variant="ghost" loading={saving} onClick={() => saveDraft("ARCHIVED")}>Archive</Button>
              )}
              <Button variant="secondary" loading={saving} onClick={() => saveDraft("DRAFT")}>Save Draft</Button>
              <Button loading={saving} onClick={() => saveDraft("ACTIVE")}>Publish Plan</Button>
            </div>
          </Card.Body>
        </Card>
        </div>
      )}

      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default WorkoutPlanTab;
