import { useCallback, useEffect, useRef, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { SkeletonDetail, ErrorState, Toast } from "../../components/feedback/States";
import nutritionService from "../../services/nutritionService";
import clientService from "../../services/clientService";
import nutritionTemplateService from "../../services/nutritionTemplateService";

const inputClass = "w-full h-9 px-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#333]";
const textareaClass = "w-full min-h-[84px] px-3 py-2 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#333]";

const DIET_OPTIONS = ["Omnivore", "Vegetarian", "Vegan", "Eggetarian", "Keto", "Intermittent Fasting"];

const emptyDraft = () => ({
  _id: null,
  planName: "",
  status: "DRAFT",
  notes: "",
  calories: "",
  protein: "",
  carbs: "",
  fats: "",
  waterTarget: "",
  mealsPerDay: "",
  cheatMeals: "",
  dietType: "",
  foodAvoidances: "",
  eatingHabits: "",
});

const draftFromPlan = (plan) => ({
  _id: plan._id,
  planName: plan.planName || "",
  status: plan.status || "DRAFT",
  notes: plan.notes || "",
  calories:       plan.calories       ?? "",
  protein:        plan.protein        ?? "",
  carbs:          plan.carbs          ?? "",
  fats:           plan.fats           ?? "",
  waterTarget:    plan.waterTarget    ?? "",
  mealsPerDay:    plan.mealsPerDay    ?? "",
  cheatMeals:     plan.cheatMeals     ?? "",
  dietType:       plan.dietType       ?? "",
  foodAvoidances: plan.foodAvoidances ?? "",
  eatingHabits:   plan.eatingHabits   ?? "",
});

const toNumber = (value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const preparePayload = (draft, status) => ({
  planName: draft.planName,
  status,
  notes: draft.notes || undefined,
  calories:    toNumber(draft.calories),
  protein:     toNumber(draft.protein),
  carbs:       toNumber(draft.carbs),
  fats:        toNumber(draft.fats),
  waterTarget: toNumber(draft.waterTarget),
  mealsPerDay: toNumber(draft.mealsPerDay),
  cheatMeals:  toNumber(draft.cheatMeals),
  dietType:       draft.dietType       || undefined,
  foodAvoidances: draft.foodAvoidances || undefined,
  eatingHabits:   draft.eatingHabits   || undefined,
});

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

/**
 * Inline picker for "Use Nutrition Template". Lazy-loads the trainer's
 * ACTIVE templates; confirming snapshots the chosen template into a
 * fresh DRAFT plan for the current client.
 */
const TemplatePicker = ({ onCancel, onConfirm, busy }) => {
  const [options, setOptions] = useState([]);
  const [target, setTarget]   = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    nutritionTemplateService.list({ status: "ACTIVE" })
      .then((items) => { if (!cancelled) setOptions(items || []); })
      .catch(() => setOptions([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mt-3 rounded-lg border border-border bg-surface-elevated p-3 flex items-center gap-2 flex-wrap">
      <span className="text-[11px] uppercase tracking-wider text-text-muted">Use template</span>
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        disabled={loading || options.length === 0 || busy}
        className="h-9 px-2 rounded-lg bg-surface border border-border text-sm text-text-primary focus:outline-none focus:border-[#333]"
      >
        <option value="">{loading ? "Loading…" : options.length === 0 ? "No active templates" : "Pick a template"}</option>
        {options.map((t) => (
          <option key={t._id} value={t._id}>{t.name}</option>
        ))}
      </select>
      <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
      <Button size="sm" onClick={() => target && onConfirm(target)} disabled={!target || busy} loading={busy}>
        Assign Template
      </Button>
    </div>
  );
};

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

/**
 * NutritionPlanTab — full DRAFT/ACTIVE/ARCHIVED workflow paralleling
 * the workout tab. Replaces the previous placeholder-button view.
 */
const NutritionPlanTab = ({ clientId }) => {
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [reassignPlanId, setReassignPlanId] = useState(null);
  const [actionBusy, setActionBusy] = useState(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [assigning, setAssigning] = useState(false);
  // Increments on every Create or Edit click so the scroll + focus effect
  // re-runs even when re-opening the same draft, but stays quiet during
  // saves and incidental draft mutations.
  const [builderSeq, setBuilderSeq] = useState(0);
  const builderRef = useRef(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextPlans = await nutritionService.listForClient(clientId);
      setPlans(nextPlans);
      setSelectedPlanId((current) => current || nextPlans[0]?._id || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load nutrition plans");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const selectedPlan = plans.find((p) => p._id === selectedPlanId) || plans[0] || null;

  const startCreate = () => {
    setDraft(emptyDraft());
    setBuilderSeq((n) => n + 1);
  };
  const startEdit = (plan) => {
    setSelectedPlanId(plan._id);
    setDraft(draftFromPlan(plan));
    setBuilderSeq((n) => n + 1);
  };

  // Smooth-scroll to the builder and focus the first field whenever the
  // user explicitly opens it (Create or Edit).
  useEffect(() => {
    if (builderSeq === 0) return;
    const node = builderRef.current;
    if (!node) return;
    const frame = requestAnimationFrame(() => {
      const HEADER_OFFSET = 16;
      const top = node.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      window.scrollTo({ top, behavior: "smooth" });
      const firstField = node.querySelector("input, textarea, select");
      firstField?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [builderSeq]);

  const changeDraft = (field, value) => setDraft((c) => ({ ...c, [field]: value }));

  const saveDraft = async (status) => {
    if (!draft) return;
    if (status === "ACTIVE" && !draft.calories) {
      setToast({ kind: "error", message: "Daily calorie target is required to publish" });
      return;
    }
    setSaving(true);
    try {
      const payload = preparePayload(draft, status);
      const saved = draft._id
        ? await nutritionService.update(draft._id, payload)
        : await nutritionService.create(clientId, payload);
      setToast({
        kind: "success",
        message: status === "ACTIVE" ? "Nutrition plan published"
               : status === "ARCHIVED" ? "Nutrition plan archived"
               : "Nutrition draft saved"
      });
      setDraft(draftFromPlan(saved));
      await loadPlans();
      setSelectedPlanId(saved._id);
    } catch (err) {
      const errors = err?.response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0] : null;
      setToast({ kind: "error", message: firstError || err?.response?.data?.message || "Failed to save nutrition plan" });
    } finally {
      setSaving(false);
    }
  };

  const publishPlan = async (plan) => {
    setActionBusy(plan._id);
    try {
      const updated = await nutritionService.publish(plan._id);
      setToast({ kind: "success", message: "Nutrition plan published" });
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
      const archived = await nutritionService.archive(plan._id);
      setToast({ kind: "success", message: "Nutrition plan archived" });
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
      await nutritionService.remove(plan._id);
      setToast({ kind: "success", message: "Nutrition plan deleted" });
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
      const copy = await nutritionService.duplicate(clientId, plan);
      setToast({ kind: "success", message: "Nutrition plan duplicated" });
      await loadPlans();
      setSelectedPlanId(copy._id);
      setDraft(draftFromPlan(copy));
    } catch (err) {
      setToast({ kind: "error", message: err?.response?.data?.message || "Failed to duplicate plan" });
    } finally {
      setActionBusy(null);
    }
  };

  const assignTemplate = async (templateId) => {
    setAssigning(true);
    try {
      const created = await nutritionTemplateService.assign(templateId, clientId);
      setToast({ kind: "success", message: "Template assigned (DRAFT plan created)" });
      setShowTemplatePicker(false);
      await loadPlans();
      if (created?._id) {
        setSelectedPlanId(created._id);
        setDraft(draftFromPlan(created));
      }
    } catch (err) {
      setToast({ kind: "error", message: err?.response?.data?.message || "Failed to assign template" });
    } finally {
      setAssigning(false);
    }
  };

  const reassignPlan = async (plan, targetClientId) => {
    setActionBusy(plan._id);
    try {
      await nutritionService.reassign(plan._id, targetClientId);
      setToast({ kind: "success", message: "Plan reassigned (DRAFT created on the new client)" });
      setReassignPlanId(null);
    } catch (err) {
      setToast({ kind: "error", message: err?.response?.data?.message || "Failed to reassign plan" });
    } finally {
      setActionBusy(null);
    }
  };

  if (loading) return <SkeletonDetail />;
  if (error) return <ErrorState title="Couldn't load nutrition plans" message={error} onRetry={loadPlans} />;

  return (
    <div className="space-y-4">
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <Card.Title>Nutrition Plans</Card.Title>
              <Card.Description>Draft, publish, edit, archive, delete, or reassign client nutrition plans.</Card.Description>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShowTemplatePicker((v) => !v)}>
                {showTemplatePicker ? "Close" : "Use Nutrition Template"}
              </Button>
              <Button size="sm" onClick={startCreate}>Create New Plan</Button>
            </div>
          </div>
          {showTemplatePicker && (
            <TemplatePicker
              busy={assigning}
              onCancel={() => setShowTemplatePicker(false)}
              onConfirm={assignTemplate}
            />
          )}
        </Card.Header>
        <Card.Body>
          {plans.length === 0 ? (
            <div className="py-10 flex flex-col items-center text-center border border-dashed border-border rounded-xl">
              <p className="text-base font-semibold text-text-primary">No nutrition plans yet</p>
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
                          {plan.calories != null ? `${plan.calories} kcal` : "No calorie target"}
                          {plan.dietType ? ` · ${plan.dietType}` : ""}
                          {plan.mealsPerDay != null ? ` · ${plan.mealsPerDay} meals/day` : ""}
                        </p>
                      </button>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button size="sm" variant="secondary" onClick={() => startEdit(plan)} disabled={busy}>Edit</Button>
                        <Button size="sm" variant="secondary" onClick={() => duplicatePlan(plan)} disabled={busy}>Duplicate</Button>
                        {plan.status !== "ACTIVE" && (
                          <Button size="sm" onClick={() => publishPlan(plan)} disabled={busy || plan.calories == null}>Publish</Button>
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

      {draft && (
        <div ref={builderRef}>
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <Card.Title>{draft._id ? "Edit Nutrition Plan" : "Create Nutrition Plan"}</Card.Title>
                <Card.Description>Set daily targets and preferences, then save draft or publish.</Card.Description>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Close Builder</Button>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
              <label className="sm:col-span-2">
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Plan name</span>
                <input value={draft.planName} onChange={(e) => changeDraft("planName", e.target.value)} className={`${inputClass} mt-1`} placeholder="Cutting Block – Phase 1" />
              </label>
              <label>
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Status</span>
                <div className="mt-2"><PlanBadge status={draft.status} /></div>
              </label>
              <label>
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Diet type</span>
                <select value={draft.dietType} onChange={(e) => changeDraft("dietType", e.target.value)} className={`${inputClass} mt-1`}>
                  <option value="">—</option>
                  {DIET_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
            </div>

            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted mb-2">Daily Targets</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <label>
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Calories (kcal)</span>
                <input type="number" min="800" max="6000" value={draft.calories} onChange={(e) => changeDraft("calories", e.target.value)} className={`${inputClass} mt-1`} placeholder="2200" />
              </label>
              <label>
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Protein (g)</span>
                <input type="number" min="20" max="500" value={draft.protein} onChange={(e) => changeDraft("protein", e.target.value)} className={`${inputClass} mt-1`} placeholder="180" />
              </label>
              <label>
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Carbs (g)</span>
                <input type="number" min="20" max="1000" value={draft.carbs} onChange={(e) => changeDraft("carbs", e.target.value)} className={`${inputClass} mt-1`} placeholder="220" />
              </label>
              <label>
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Fats (g)</span>
                <input type="number" min="10" max="300" value={draft.fats} onChange={(e) => changeDraft("fats", e.target.value)} className={`${inputClass} mt-1`} placeholder="70" />
              </label>
              <label>
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Water (L/day)</span>
                <input type="number" min="0.5" max="10" step="0.1" value={draft.waterTarget} onChange={(e) => changeDraft("waterTarget", e.target.value)} className={`${inputClass} mt-1`} placeholder="3.0" />
              </label>
              <label>
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Meals / day</span>
                <input type="number" min="1" max="8" value={draft.mealsPerDay} onChange={(e) => changeDraft("mealsPerDay", e.target.value)} className={`${inputClass} mt-1`} placeholder="4" />
              </label>
              <label>
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Cheat meals / week</span>
                <input type="number" min="0" max="7" value={draft.cheatMeals} onChange={(e) => changeDraft("cheatMeals", e.target.value)} className={`${inputClass} mt-1`} placeholder="1" />
              </label>
            </div>

            <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted mb-2">Preferences</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <label>
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Food avoidances</span>
                <input value={draft.foodAvoidances} onChange={(e) => changeDraft("foodAvoidances", e.target.value)} className={`${inputClass} mt-1`} placeholder="Shellfish, broccoli" />
              </label>
              <label>
                <span className="text-[11px] uppercase tracking-wider text-text-muted">Eating habits</span>
                <textarea value={draft.eatingHabits} onChange={(e) => changeDraft("eatingHabits", e.target.value)} className={`${textareaClass} mt-1`} placeholder="Current diet, meal timing, relationship with food…" />
              </label>
            </div>

            <label className="block mb-1">
              <span className="text-[11px] uppercase tracking-wider text-text-muted">Plan notes</span>
              <textarea value={draft.notes} onChange={(e) => changeDraft("notes", e.target.value)} className={`${textareaClass} mt-1`} placeholder="Coaching notes for this plan…" />
            </label>

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

export default NutritionPlanTab;
