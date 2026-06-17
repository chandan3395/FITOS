import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import {
  FlameIcon,
  CheckCircleIcon,
  WarningIcon,
} from "../../components/design-system/Icons";
import { ROUTES } from "../../constants/routes";
import { SkeletonDetail, ErrorState, EmptyState, Toast } from "../../components/feedback/States";
import InlineEditField from "../../components/trainer/InlineEditField";
import clientService from "../../services/clientService";
import workoutService from "../../services/workoutService";
import checkinService from "../../services/checkinService";
import progressPhotoService from "../../services/progressPhotoService";
import mealCheckinService from "../../services/mealCheckinService";
import ComparePhotos from "../../components/progress/ComparePhotos";
import WorkoutPlanTab from "./WorkoutPlanTab";
import NutritionPlanTab from "./NutritionPlanTab";
import MessageThread from "../../components/messaging/MessageThread";
import { useUnread } from "../../contexts/UnreadContext";

const TABS = [
  { id: "overview",  label: "Overview" },
  { id: "checkins",  label: "Check-ins" },
  { id: "photos",    label: "Progress Photos" },
  { id: "meals",     label: "Meal Check-ins" },
  { id: "workout",   label: "Workout Plan" },
  { id: "nutrition", label: "Nutrition Plan" },
  { id: "notes",     label: "Notes" },
  { id: "messages",  label: "Messages" },
];

const initials = (name = "") => name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

const KV = ({ label, value, accent = "text-text-primary" }) => (
  <div>
    <p className="text-[11px] font-semibold tracking-[0.08em] text-text-muted uppercase">{label}</p>
    <p className={`text-base font-semibold mt-1 ${accent}`}>{value || <span className="text-text-muted">—</span>}</p>
  </div>
);

// ── Field validators (mirror backend clientPayload.validator) ───
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RX = /^[0-9+\s\-()]{7,20}$/;
const GENDER_OPTS = [
  { value: "MALE",   label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER",  label: "Other" },
];

const vName  = (v) => !v ? "Name is required." : v.length < 2 ? "Name must be at least 2 characters." : null;
const vEmail = (v) => !v ? "Email is required." : EMAIL_RX.test(v) ? null : "Enter a valid email address.";
const vPhone = (v) => !v ? "Phone is required." : PHONE_RX.test(v) ? null : "Enter a valid phone number (7–20 digits).";
const vGoal  = (v) => !v ? "Goal is required." : v.length < 2 ? "Goal must be at least 2 characters." : null;
const vDob   = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return "Enter a valid date.";
  if (d > new Date()) return "Date of birth must be in the past.";
  return null;
};
const vGoalDesc = (v) => !v ? null : v.length < 20 ? "Goal description must be at least 20 characters." : null;
// Numeric range validator; empty leaves the field unchanged.
const vNum = (min, max, label, { integer = false } = {}) => (v) => {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return `${label} must be a number.`;
  if (integer && !Number.isInteger(n)) return `${label} must be a whole number.`;
  if (n < min || n > max) return `${label} must be between ${min} and ${max}.`;
  return null;
};

const todayDayNumber = () => {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 7 : jsDay;
};

// ── TODAY'S WORKOUT STATUS (trainer read-only) ──────────────────
// Self-contained: fetches the client's ACTIVE plan + completions so the
// trainer sees today's adherence at a glance, without opening the workout
// tab. Silent on failure — it's a glanceable widget, not a blocking view.
const TodaysWorkoutStatus = ({ clientId }) => {
  const [plan, setPlan] = useState(null);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const plans = await workoutService.listForClient(clientId, { status: "ACTIVE" });
        const active = plans[0] || null;
        let comps = [];
        if (active) comps = await workoutService.completions(active._id).catch(() => []);
        if (!cancelled) { setPlan(active); setCompletions(comps); }
      } catch {
        if (!cancelled) { setPlan(null); setCompletions([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  const completedIds = new Set(completions.map((c) => String(c.exerciseId)));
  const currentDay = todayDayNumber();
  const todays = (plan?.exercises || [])
    .filter((ex) => Number(ex.dayNumber || 1) === currentDay)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const done = todays.filter((ex) => completedIds.has(String(ex._id))).length;
  const pct = todays.length ? Math.round((done / todays.length) * 100) : 0;

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between gap-3">
          <Card.Title>Today&apos;s Workout Status</Card.Title>
          {plan && todays.length > 0 && (
            <span className="text-[12px] font-semibold text-primary">{pct}% · {done}/{todays.length}</span>
          )}
        </div>
      </Card.Header>
      <Card.Body>
        {loading ? (
          <p className="text-sm text-text-muted py-2">Loading today&apos;s workout…</p>
        ) : !plan ? (
          <p className="text-sm text-text-secondary">No active workout plan assigned.</p>
        ) : todays.length === 0 ? (
          <p className="text-sm text-text-secondary">Nothing scheduled for today (Day {currentDay}).</p>
        ) : (
          <>
            <div className="h-2 rounded-full bg-surface-elevated overflow-hidden mb-4">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="space-y-2">
              {todays.map((ex) => {
                const completed = completedIds.has(String(ex._id));
                return (
                  <div key={ex._id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-elevated border border-border px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{ex.name}</p>
                      <p className="text-[12px] text-text-muted">
                        {ex.sets || "—"} sets × {ex.reps || "—"} reps{ex.weight != null ? ` · ${ex.weight} kg` : ""}
                      </p>
                    </div>
                    {completed ? (
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-300 shrink-0">
                        <CheckCircleIcon size={14} /> Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-text-muted shrink-0">
                        <span className="w-3.5 h-3.5 rounded-[4px] border border-text-muted/60" /> Pending
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

// ── OVERVIEW ────────────────────────────────────────────────────
// `onSaveField(field, value, label)` persists a single field, refreshes the
// client, and toasts — supplied by the page. Read-only when absent (e.g. an
// archived client or a non-trainer viewer).
const OverviewTab = ({ client, lastCheckIn, onSaveField }) => {
  const current = lastCheckIn?.weight ?? client.startingWeight ?? null;
  const change  = current && client.startingWeight ? (current - client.startingWeight).toFixed(1) : null;
  const dob     = client.dob ? new Date(client.dob).toLocaleDateString() : null;
  const startDt = client.startDate ? new Date(client.startDate).toLocaleDateString() : null;

  const hasHealth = client.medicalConditions || client.medications || client.pastInjuries || client.allergies;
  const editable  = typeof onSaveField === "function";

  // Email-mismatch audit: the invited address (snapshotted at link time,
  // falling back to the current profile email) vs the linked Google email.
  const invitedEmail = (client.invitedEmail || client.email || "").toLowerCase();
  const linkedGoogle = (client.googleEmail || "").toLowerCase();
  const emailMismatch = client.googleLinked && invitedEmail && linkedGoogle && invitedEmail !== linkedGoogle;

  // Helper: render an inline-editable field bound to `client[name]`.
  const F = (name, label, props = {}) => (
    <InlineEditField
      label={label}
      value={client[name]}
      editable={editable}
      onSave={(v) => onSaveField(name, v, label)}
      {...props}
    />
  );

  return (
    <div className="space-y-4">
      {/* Email mismatch — informational; account is linked and working */}
      {emailMismatch && (
        <Card className="border-amber-400/30 bg-amber-400/[0.04]">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 text-amber-300 flex items-center justify-center shrink-0">
              <WarningIcon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-200">Email Mismatch Detected</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[13px]">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted">Invited Email</p>
                  <p className="text-text-secondary mt-0.5 break-all">{invitedEmail}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted">Linked Google Email</p>
                  <p className="text-text-secondary mt-0.5 break-all">{linkedGoogle}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted">Status</p>
                  <p className="text-emerald-300 mt-0.5 flex items-center gap-1.5">
                    <CheckCircleIcon size={13} /> Account Linked Successfully
                  </p>
                </div>
              </div>
              <p className="text-[12px] text-text-muted mt-3">
                This is informational only — the account is linked and continues to function normally.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Goal snapshot */}
      <Card>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {F("goal", "Goal", { validate: vGoal })}
          {F("startingWeight", "Starting", {
            type: "number", validate: vNum(20, 300, "Starting weight"),
            display: client.startingWeight ? `${client.startingWeight} kg` : null,
          })}
          <KV label="Current" value={current ? `${current} kg` : null} />
          {F("targetWeight", "Target", {
            type: "number", validate: vNum(20, 300, "Target weight"),
            display: client.targetWeight ? `${client.targetWeight} kg` : null,
          })}
        </div>
      </Card>

      {/* Today's workout adherence — glanceable, no extra navigation */}
      <TodaysWorkoutStatus clientId={client._id} />

      {/* Quick metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <Card.Header><Card.Title>Weight Change</Card.Title></Card.Header>
          <Card.Body>
            <p className={`text-2xl font-bold ${change && Number(change) < 0 ? "text-emerald-300" : "text-text-primary"}`}>
              {change ? `${change} kg` : "—"}
            </p>
            <p className="text-[12px] text-text-muted mt-1">Since program start</p>
          </Card.Body>
        </Card>
        <Card>
          <Card.Header><Card.Title>Streak</Card.Title></Card.Header>
          <Card.Body>
            <p className="text-2xl font-bold text-amber-300 flex items-center gap-2">
              <FlameIcon size={20} /> —
            </p>
            <p className="text-[12px] text-text-muted mt-1">Available after first check-in</p>
          </Card.Body>
        </Card>
        <Card>
          <Card.Header><Card.Title>Last Check-in</Card.Title></Card.Header>
          <Card.Body>
            <p className="text-2xl font-bold text-text-primary">{lastCheckIn ? fmtDate(lastCheckIn.createdAt) : "—"}</p>
            <p className="text-[12px] text-text-muted mt-1">{lastCheckIn ? `Status: ${lastCheckIn.status}` : "No check-ins yet"}</p>
          </Card.Body>
        </Card>
      </div>

      {/* Body metrics */}
      <Card>
        <Card.Header><Card.Title>Body Metrics</Card.Title></Card.Header>
        <Card.Body>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {F("height", "Height", {
              type: "number", validate: vNum(80, 250, "Height"),
              display: client.height ? `${client.height} cm` : null,
            })}
            {F("bodyFat", "Body Fat", {
              type: "number", validate: vNum(1, 60, "Body fat"),
              display: client.bodyFat != null ? `${client.bodyFat} %` : null,
            })}
            {F("targetBodyFat", "Target Body Fat", {
              type: "number", validate: vNum(1, 60, "Target body fat"),
              display: client.targetBodyFat != null ? `${client.targetBodyFat} %` : null,
            })}
            {F("age", "Age", {
              type: "number", validate: vNum(1, 120, "Age", { integer: true }),
              display: client.age ? `${client.age} yrs` : null,
            })}
          </div>
        </Card.Body>
      </Card>

      {/* Program details */}
      <Card>
        <Card.Header><Card.Title>Program</Card.Title></Card.Header>
        <Card.Body>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <KV label="Timeline"        value={client.timeline} />
            <KV label="Duration"        value={client.duration} />
            <KV label="Session Cadence" value={client.sessionFrequency} />
            <KV label="Start Date"      value={startDt} />
          </div>
          <div className="mt-5">
            {F("goalDescription", "Goal Description", {
              type: "textarea", validate: vGoalDesc,
              placeholder: "Describe the client's goal in detail (min 20 characters)…",
              display: client.goalDescription
                ? <span className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed font-normal">{client.goalDescription}</span>
                : null,
            })}
          </div>
        </Card.Body>
      </Card>

      {/* Personal Information */}
      <Card>
        <Card.Header>
          <Card.Title>Personal Information</Card.Title>
          {editable && <Card.Description>Hover a field and click the pencil to edit it.</Card.Description>}
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {F("name", "Full Name", { validate: vName })}
            {F("email", "Email", { type: "email", validate: vEmail })}
            {F("phone", "Phone", { type: "tel", validate: vPhone })}
            {F("city", "City")}
            {F("occupation", "Occupation")}
            {F("gender", "Gender", { type: "select", options: GENDER_OPTS })}
            {F("dob", "Date of Birth", { type: "date", validate: vDob, display: dob })}
            <KV label="Invite Sent" value={client.lastInviteSentAt ? fmtDate(client.lastInviteSentAt) : null} />
          </div>
        </Card.Body>
      </Card>

      {/* Health summary — only shown when at least one health field is set */}
      {hasHealth && (
        <Card>
          <Card.Header>
            <Card.Title>Health History</Card.Title>
            <Card.Description>Captured at onboarding — critical for safe programming.</Card.Description>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <KV label="Medical Conditions" value={client.medicalConditions} />
              <KV label="Current Medications" value={client.medications} />
              <KV label="Past Injuries" value={client.pastInjuries} />
              <KV label="Allergies / Dietary Restrictions" value={client.allergies} />
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

// ── CHECK-INS ──────────────────────────────────────────────────
const CheckinsTab = ({ clientId, items, loading, error, onReload }) => {
  const [draft, setDraft]     = useState({ weight: "", sleep: "", water: "", energy: "", mood: "", notes: "" });
  const [submitting, setSub]  = useState(false);
  const [toast, setToast]     = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSub(true);
    try {
      const num = (v) => v === "" ? undefined : Number(v);
      await checkinService.create({
        clientId,
        weight: num(draft.weight),
        sleep:  num(draft.sleep),
        water:  num(draft.water),
        energy: num(draft.energy),
        mood:   num(draft.mood),
        notes:  draft.notes || undefined,
      });
      setDraft({ weight: "", sleep: "", water: "", energy: "", mood: "", notes: "" });
      setToast({ kind: "success", message: "Check-in logged" });
      onReload();
    } catch (err) {
      setToast({ kind: "error", message: err?.response?.data?.message || "Failed to create check-in" });
    } finally {
      setSub(false);
    }
  };

  const cls = "w-full h-9 px-2 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-[#333]";

  return (
    <div className="space-y-4">
      <Card>
        <Card.Header>
          <Card.Title>Log a Check-in (prototype)</Card.Title>
          <Card.Description>Trainers can log on behalf of the client during the prototype phase.</Card.Description>
        </Card.Header>
        <Card.Body>
          <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <input type="number" step="0.1" placeholder="Weight kg"  value={draft.weight} onChange={(e) => setDraft({...draft, weight: e.target.value})} className={cls} />
            <input type="number" step="0.1" placeholder="Sleep hrs"  value={draft.sleep}  onChange={(e) => setDraft({...draft, sleep:  e.target.value})} className={cls} />
            <input type="number" step="0.1" placeholder="Water L"    value={draft.water}  onChange={(e) => setDraft({...draft, water:  e.target.value})} className={cls} />
            <input type="number" min="1" max="5" placeholder="Energy 1-5" value={draft.energy} onChange={(e) => setDraft({...draft, energy: e.target.value})} className={cls} />
            <input type="number" min="1" max="5" placeholder="Mood 1-5"   value={draft.mood}   onChange={(e) => setDraft({...draft, mood:   e.target.value})} className={cls} />
            <Button type="submit" loading={submitting} size="sm">Log</Button>
            <input type="text" placeholder="Notes" value={draft.notes} onChange={(e) => setDraft({...draft, notes: e.target.value})} className={`${cls} col-span-2 sm:col-span-6`} />
          </form>
        </Card.Body>
      </Card>

      {loading
        ? <SkeletonDetail />
        : error
          ? <ErrorState title="Couldn't load check-ins" message={error} onRetry={onReload} />
          : items.length === 0
            ? <EmptyState title="No check-ins yet" description="Once logged they'll appear here in reverse-chronological order." />
            : (
              <div className="space-y-3">
                {items.map((c) => (
                  <Card key={c._id}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{fmtDate(c.createdAt)}</p>
                        <p className="text-[11px] text-text-muted uppercase">{c.status}</p>
                      </div>
                      {c.status === "FLAGGED" && <span className="text-red-300 text-[11px] font-medium">⚠ Flagged</span>}
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-sm">
                      <div><span className="text-text-muted text-[11px]">Weight</span><br/>{c.weight ?? "—"}</div>
                      <div><span className="text-text-muted text-[11px]">Sleep</span><br/>{c.sleep ?? "—"}</div>
                      <div><span className="text-text-muted text-[11px]">Water</span><br/>{c.water ?? "—"}</div>
                      <div><span className="text-text-muted text-[11px]">Energy</span><br/>{c.energy ?? "—"}</div>
                      <div><span className="text-text-muted text-[11px]">Mood</span><br/>{c.mood ?? "—"}</div>
                      <div><span className="text-text-muted text-[11px]">Reviewed</span><br/>{c.reviewedAt ? fmtDate(c.reviewedAt) : "—"}</div>
                    </div>
                    {c.notes && <p className="mt-3 text-[12.5px] text-text-secondary">{c.notes}</p>}
                  </Card>
                ))}
              </div>
            )
      }
      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />
    </div>
  );
};

// ── PROGRESS PHOTOS ─────────────────────────────────────────────
const PHOTO_BADGE = {
  PENDING:  { label: "Pending review", cls: "bg-amber-400/10 text-amber-300" },
  REVIEWED: { label: "Reviewed",       cls: "bg-emerald-400/10 text-emerald-300" },
  FLAGGED:  { label: "Flagged",        cls: "bg-red-500/10 text-red-300" },
};

const PhotoStatusBadge = ({ status }) => {
  const meta = PHOTO_BADGE[status] || PHOTO_BADGE.PENDING;
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${meta.cls}`}>
      {meta.label}
    </span>
  );
};

const PhotosTab = ({ clientId, items, loading, error, onReload }) => {
  const fileRef = useRef(null);
  const [week, setWeek] = useState("");
  const [files, setFiles] = useState({ front: null, side: null, back: null });
  const [uploading, setUp] = useState(false);
  const [toast, setToast] = useState(null);
  const [commentDraft, setCommentDraft] = useState({});
  const [actionBusy, setActionBusy] = useState(null);

  const upload = async (e) => {
    e.preventDefault();
    if (!week) return setToast({ kind: "error", message: "Week number is required" });
    if (!files.front && !files.side && !files.back) {
      return setToast({ kind: "error", message: "Pick at least one photo (front, side, or back)" });
    }
    setUp(true);
    try {
      await progressPhotoService.upload({ clientId, weekNumber: Number(week), ...files });
      setFiles({ front: null, side: null, back: null });
      setWeek("");
      if (fileRef.current) fileRef.current.reset();
      setToast({ kind: "success", message: "Photos uploaded" });
      onReload();
    } catch (err) {
      setToast({ kind: "error", message: err?.response?.data?.message || "Upload failed" });
    } finally {
      setUp(false);
    }
  };

  const saveComment = async (id) => {
    setActionBusy(id);
    try {
      await progressPhotoService.comment(id, commentDraft[id] ?? "");
      setToast({ kind: "success", message: "Comment saved · marked Reviewed" });
      onReload();
    } catch (err) {
      setToast({ kind: "error", message: err?.response?.data?.message || "Comment failed" });
    } finally {
      setActionBusy(null);
    }
  };

  const setPhotoStatus = async (id, status) => {
    setActionBusy(id);
    try {
      await progressPhotoService.setStatus(id, status);
      setToast({ kind: "success", message: `Marked ${status.toLowerCase()}` });
      onReload();
    } catch (err) {
      setToast({ kind: "error", message: err?.response?.data?.message || "Status update failed" });
    } finally {
      setActionBusy(null);
    }
  };

  const deletePhotoSet = async (p) => {
    if (!confirm(`Delete the Week ${p.weekNumber} photo set? This cannot be undone.`)) return;
    setActionBusy(p._id);
    try {
      await progressPhotoService.remove(p._id);
      setToast({ kind: "success", message: "Photo set deleted" });
      onReload();
    } catch (err) {
      setToast({ kind: "error", message: err?.response?.data?.message || "Delete failed" });
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between gap-3">
            <Card.Title>Upload Photos</Card.Title>
            <ComparePhotos photos={items} />
          </div>
        </Card.Header>
        <Card.Body>
          <form ref={fileRef} onSubmit={upload} className="space-y-3">
            <input
              type="number"
              min="1"
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              placeholder="Week number"
              className="w-32 h-9 px-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {["front", "side", "back"].map((slot) => (
                <label key={slot} className="block">
                  <span className="text-[11px] uppercase tracking-wider text-text-muted">{slot}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFiles((f) => ({ ...f, [slot]: e.target.files?.[0] || null }))}
                    className="block w-full mt-1 text-[12px] text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-primary file:text-white file:text-[12px] file:cursor-pointer"
                  />
                </label>
              ))}
            </div>
            <Button type="submit" loading={uploading}>Upload</Button>
          </form>
        </Card.Body>
      </Card>

      {loading
        ? <SkeletonDetail />
        : error
          ? <ErrorState title="Couldn't load photos" message={error} onRetry={onReload} />
          : items.length === 0
            ? <EmptyState title="No progress photos yet" description="Upload the first set above." />
            : items.map((p) => {
                const busy = actionBusy === p._id;
                return (
                  <Card key={p._id}>
                    <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Card.Title>Week {p.weekNumber}</Card.Title>
                          <PhotoStatusBadge status={p.status} />
                        </div>
                        {/*
                          Three-line metadata: who uploaded it, when, and
                          (implicit via the badge above) review status. We
                          prefer the uploader's name when populated; fall
                          back to the role-only string so old records
                          without uploaderRole still read cleanly.
                        */}
                        <p className="text-[12px] text-text-muted mt-1">
                          {(() => {
                            const name = p.uploadedBy?.name;
                            const role = p.uploaderRole;
                            if (name && role) return `Uploaded by ${name} (${role.charAt(0) + role.slice(1).toLowerCase()})`;
                            if (name)         return `Uploaded by ${name}`;
                            if (role)         return `Uploaded by ${role.charAt(0) + role.slice(1).toLowerCase()}`;
                            return "Uploader unknown";
                          })()}
                        </p>
                        <p className="text-[12px] text-text-muted mt-0.5">{fmtDate(p.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {p.status !== "REVIEWED" && (
                          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setPhotoStatus(p._id, "REVIEWED")}>
                            Mark Reviewed
                          </Button>
                        )}
                        {p.status !== "FLAGGED" && (
                          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setPhotoStatus(p._id, "FLAGGED")}>
                            Flag
                          </Button>
                        )}
                        <Button size="sm" variant="danger" disabled={busy} onClick={() => deletePhotoSet(p)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {["front", "side", "back"].map((slot) => {
                        const photo = p[`${slot}Photo`];
                        return (
                          <div key={slot} className="aspect-square rounded-xl bg-surface-elevated border border-border overflow-hidden flex items-center justify-center text-text-muted text-[12px]">
                            {photo
                              ? <a href={photo.url} target="_blank" rel="noreferrer" className="block w-full h-full"><img src={photo.thumbnailUrl} alt={slot} className="w-full h-full object-cover" /></a>
                              : <span className="capitalize">{slot} — none</span>
                            }
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input
                        defaultValue={p.comment || ""}
                        onChange={(e) => setCommentDraft((d) => ({ ...d, [p._id]: e.target.value }))}
                        placeholder="Add a comment for the client…"
                        className="flex-1 h-9 px-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary"
                      />
                      <Button size="sm" disabled={busy} onClick={() => saveComment(p._id)}>Save Comment</Button>
                    </div>
                  </Card>
                );
              })
      }
      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />
    </div>
  );
};

// ── MEAL CHECK-INS (trainer review) ─────────────────────────────
const MEAL_BADGE = {
  PENDING:  { label: "Pending review", cls: "bg-amber-400/10 text-amber-300" },
  REVIEWED: { label: "Approved",       cls: "bg-emerald-400/10 text-emerald-300" },
  FLAGGED:  { label: "Flagged",        cls: "bg-red-500/10 text-red-300" },
};
const MEAL_LABELS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };
const MEALS_ORDER = ["breakfast", "lunch", "dinner", "snack"];

const fmtDay = (d) => {
  if (!d) return "—";
  const parsed = new Date(`${d}T00:00:00`);
  return isNaN(parsed.getTime())
    ? d
    : parsed.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
};

const MealStatusBadge = ({ status }) => {
  const meta = MEAL_BADGE[status] || MEAL_BADGE.PENDING;
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${meta.cls}`}>
      {meta.label}
    </span>
  );
};

const MealCheckinsTab = ({ items, loading, error, onReload }) => {
  const [commentDraft, setCommentDraft] = useState({});
  const [actionBusy, setActionBusy] = useState(null);
  const [toast, setToast] = useState(null);

  const saveComment = async (id) => {
    setActionBusy(id);
    try {
      await mealCheckinService.comment(id, commentDraft[id] ?? "");
      setToast({ kind: "success", message: "Comment saved · approved" });
      onReload();
    } catch (err) {
      setToast({ kind: "error", message: err?.response?.data?.message || "Comment failed" });
    } finally {
      setActionBusy(null);
    }
  };

  const setStatus = async (id, status) => {
    setActionBusy(id);
    try {
      await mealCheckinService.setStatus(id, status);
      setToast({ kind: "success", message: status === "REVIEWED" ? "Approved" : "Flagged" });
      onReload();
    } catch (err) {
      setToast({ kind: "error", message: err?.response?.data?.message || "Status update failed" });
    } finally {
      setActionBusy(null);
    }
  };

  const remove = async (m) => {
    if (!confirm(`Delete the meal check-in for ${fmtDay(m.date)}? This cannot be undone.`)) return;
    setActionBusy(m._id);
    try {
      await mealCheckinService.remove(m._id);
      setToast({ kind: "success", message: "Meal check-in deleted" });
      onReload();
    } catch (err) {
      setToast({ kind: "error", message: err?.response?.data?.message || "Delete failed" });
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <Card.Header>
          <Card.Title>Meal Check-ins</Card.Title>
          <Card.Description>
            Daily meal photos your client uploads as proof of adherence. Approve, flag, or leave feedback.
          </Card.Description>
        </Card.Header>
      </Card>

      {loading
        ? <SkeletonDetail />
        : error
          ? <ErrorState title="Couldn't load meal check-ins" message={error} onRetry={onReload} />
          : items.length === 0
            ? <EmptyState title="No meal check-ins yet" description="When your client logs their meals, the daily photos will appear here for review." />
            : items.map((m) => {
                const busy = actionBusy === m._id;
                const mealCount = MEALS_ORDER.filter((meal) => m[meal]).length;
                return (
                  <Card key={m._id}>
                    <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Card.Title>{fmtDay(m.date)}</Card.Title>
                          <MealStatusBadge status={m.status} />
                          <span className="text-[11px] text-text-muted">{mealCount} of 4 meals</span>
                        </div>
                        <p className="text-[12px] text-text-muted mt-1">
                          {(() => {
                            const name = m.uploadedBy?.name;
                            const role = m.uploaderRole;
                            if (name && role) return `Logged by ${name} (${role.charAt(0) + role.slice(1).toLowerCase()})`;
                            if (name)         return `Logged by ${name}`;
                            if (role)         return `Logged by ${role.charAt(0) + role.slice(1).toLowerCase()}`;
                            return "Logged";
                          })()} · {fmtDate(m.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {m.status !== "REVIEWED" && (
                          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setStatus(m._id, "REVIEWED")}>
                            Approve
                          </Button>
                        )}
                        {m.status !== "FLAGGED" && (
                          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setStatus(m._id, "FLAGGED")}>
                            Flag
                          </Button>
                        )}
                        <Button size="sm" variant="danger" disabled={busy} onClick={() => remove(m)}>
                          Delete
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {MEALS_ORDER.map((meal) => {
                        const photo = m[meal];
                        return (
                          <div key={meal}>
                            <p className="text-[11px] uppercase tracking-wider text-text-muted mb-1.5">{MEAL_LABELS[meal]}</p>
                            <div className="aspect-square rounded-xl bg-surface-elevated border border-border overflow-hidden flex items-center justify-center text-text-muted text-[11px]">
                              {photo
                                ? <a href={photo.url} target="_blank" rel="noreferrer" className="block w-full h-full"><img src={photo.thumbnailUrl} alt={meal} className="w-full h-full object-cover" /></a>
                                : <span>Not logged</span>
                              }
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {m.note && (
                      <p className="mt-3 text-[12.5px] text-text-secondary">
                        <span className="text-text-muted">Client note:</span> {m.note}
                      </p>
                    )}

                    <div className="mt-3 flex gap-2">
                      <input
                        defaultValue={m.comment || ""}
                        onChange={(e) => setCommentDraft((d) => ({ ...d, [m._id]: e.target.value }))}
                        placeholder="Add feedback for the client…"
                        className="flex-1 h-9 px-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary"
                      />
                      <Button size="sm" disabled={busy} onClick={() => saveComment(m._id)}>Save Comment</Button>
                    </div>
                  </Card>
                );
              })
      }
      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />
    </div>
  );
};

// ── Notes tab — trainer-private notes, inline-editable.
const NotesPlanTab = ({ client, onSaveField }) => {
  const editable = typeof onSaveField === "function";
  return (
    <Card>
      <Card.Header>
        <Card.Title>Private Trainer Notes</Card.Title>
        <Card.Description>Only visible to you. {editable ? "Click the pencil to edit." : "Captured during onboarding."}</Card.Description>
      </Card.Header>
      <Card.Body>
        {editable ? (
          <InlineEditField
            label="Notes"
            value={client.privateNotes}
            type="textarea"
            placeholder="Add private notes about this client…"
            onSave={(v) => onSaveField("privateNotes", v, "Notes")}
            display={client.privateNotes
              ? <span className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed font-normal">{client.privateNotes}</span>
              : null}
          />
        ) : client.privateNotes ? (
          <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{client.privateNotes}</p>
        ) : (
          <EmptyState title="No notes recorded" description="Add notes from the Add Client wizard or future edit flow." />
        )}
      </Card.Body>
    </Card>
  );
};

// ── Messages tab — real trainer⇄client chat (REST history + live socket). ──
// The thread UI lives in the shared <MessageThread> component so the trainer
// and client portals stay identical. The trainer supplies the Client profile
// id; the conversation is resolved/materialized on the backend.
const MessagesTab = ({ client }) => (
  <MessageThread clientId={client?._id} fallbackName={client?.name} />
);

// ── PAGE ────────────────────────────────────────────────────────
const TrainerClientDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { unreadForClient } = useUnread();
  const [tab, setTab] = useState("overview");

  const [client, setClient]   = useState(null);
  const [checkins, setCins]   = useState([]);
  const [photos, setPhotos]   = useState([]);
  const [meals, setMeals]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [archiveBusy, setArc] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);
  const [inviteBannerDismissed, setInviteBannerDismissed] = useState(false);
  const [newInviteUrl, setNewInviteUrl] = useState(null);
  const [toast, setToast]     = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await clientService.getById(id);
      setClient(c);
      const [cins, pics, mls] = await Promise.all([
        checkinService.list({ clientId: id }).catch(() => []),
        progressPhotoService.listForClient(id).catch(() => []),
        mealCheckinService.listForClient(id).catch(() => []),
      ]);
      setCins(cins);
      setPhotos(pics);
      setMeals(mls);
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message;
      if (status === 403) setError("You don't have access to this client.");
      else if (status === 404) setError("Client not found.");
      else setError(msg || e?.message || "Failed to load client");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  const reloadCheckins = useCallback(async () => {
    setCins(await checkinService.list({ clientId: id }).catch(() => []));
  }, [id]);

  const reloadPhotos = useCallback(async () => {
    setPhotos(await progressPhotoService.listForClient(id).catch(() => []));
  }, [id]);

  const reloadMeals = useCallback(async () => {
    setMeals(await mealCheckinService.listForClient(id).catch(() => []));
  }, [id]);

  // Persist a single profile field (CRM-style inline edit). Updates by
  // clientId — never email — so workouts, nutrition, check-ins, photos and
  // activity history all stay attached. Throws on failure so the field's
  // editor can surface an inline error; toasts on success.
  const saveField = useCallback(async (field, value, label) => {
    const updated = await clientService.update(id, { [field]: value });
    if (updated) setClient(updated);
    // A fresh edit may have re-flagged the invite as stale — un-dismiss so the
    // warning banner can reappear when the server sets inviteNeedsRegeneration.
    setInviteBannerDismissed(false);
    setToast({ kind: "success", message: `${label || "Field"} updated successfully` });
  }, [id]);

  const resendInvite = async () => {
    setInviteBusy(true);
    try {
      const result = await clientService.sendInvite(id);
      if (result?.client) setClient(result.client);
      setToast({ kind: "success", message: "WhatsApp invite sent" });
    } catch (e) {
      setToast({ kind: "error", message: e?.response?.data?.message || "Couldn't send invite" });
    } finally {
      setInviteBusy(false);
    }
  };

  const regenerateInvite = async () => {
    setRegenBusy(true);
    try {
      const result = await clientService.regenerateInvite(id);
      if (result?.client) setClient(result.client);
      setNewInviteUrl(result?.invite?.activationUrl || null);
      setInviteBannerDismissed(true);
      setToast({ kind: "success", message: "New invite link generated" });
    } catch (e) {
      setToast({ kind: "error", message: e?.response?.data?.message || "Couldn't regenerate invite" });
    } finally {
      setRegenBusy(false);
    }
  };

  const archive = async () => {
    if (!confirm("Archive this client?")) return;
    setArc(true);
    try {
      await clientService.archive(id);
      setToast({ kind: "success", message: "Client archived" });
      setTimeout(() => navigate(ROUTES.TRAINER_CLIENTS), 700);
    } catch (e) {
      setToast({ kind: "error", message: e?.response?.data?.message || "Archive failed" });
    } finally {
      setArc(false);
    }
  };

  const doDelete = async () => {
    setDeleteBusy(true);
    try {
      await clientService.remove(id);
      setDeleteOpen(false);
      setToast({ kind: "success", message: "Client deleted" });
      // Leave the now-inaccessible detail page for the client list.
      setTimeout(() => navigate(ROUTES.TRAINER_CLIENTS), 700);
    } catch (e) {
      setToast({ kind: "error", message: e?.response?.data?.message || "Delete failed" });
      setDeleteBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Link to={ROUTES.TRAINER_CLIENTS} className="text-sm text-text-muted hover:text-text-primary transition-colors">← Back to Clients</Link>
        <SkeletonDetail />
      </div>
    );
  }
  if (error || !client) {
    return (
      <div className="space-y-6">
        <Link to={ROUTES.TRAINER_CLIENTS} className="text-sm text-text-muted hover:text-text-primary transition-colors">← Back to Clients</Link>
        <ErrorState title="Couldn't load this client" message={error || "Unknown error"} onRetry={reload} />
      </div>
    );
  }

  const lastCheckIn = checkins[0] || null;
  const STATUS_META = {
    ARCHIVED: { label: "Archived", color: "bg-zinc-800 text-zinc-400" },
    PENDING:  { label: "Pending",  color: "bg-amber-400/10 text-amber-300" },
    ACTIVE:   { label: "Active",   color: "bg-emerald-400/10 text-emerald-300" },
  };
  const statusMeta  = STATUS_META[client.status] || STATUS_META.ACTIVE;
  const statusLabel = statusMeta.label;
  const statusColor = statusMeta.color;

  // Editing is a trainer capability; archived clients are read-only.
  const canEdit = client.status !== "ARCHIVED";
  const editSaver = canEdit ? saveField : undefined;

  const tabContent = {
    overview:  <OverviewTab client={client} lastCheckIn={lastCheckIn} onSaveField={editSaver} />,
    checkins:  <CheckinsTab clientId={id} items={checkins} loading={false} error={null} onReload={reloadCheckins} />,
    photos:    <PhotosTab   clientId={id} items={photos}   loading={false} error={null} onReload={reloadPhotos}   />,
    meals:     <MealCheckinsTab clientId={id} items={meals} loading={false} error={null} onReload={reloadMeals} />,
    workout:   <WorkoutPlanTab clientId={id} />,
    nutrition: <NutritionPlanTab clientId={id} />,
    notes:     <NotesPlanTab     client={client} onSaveField={editSaver} />,
    messages:  <MessagesTab      client={client} />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link to={ROUTES.TRAINER_CLIENTS} className="text-text-muted hover:text-text-primary transition-colors">← Back to Clients</Link>
        <span className="text-text-muted">·</span>
        <span className="text-text-primary font-medium">{client.name}</span>
      </div>

      <Card>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/20 text-sky-300 flex items-center justify-center text-base font-bold">
              {initials(client.name)}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary">{client.name}</h2>
              <p className="text-sm text-text-secondary mt-0.5">
                {client.goal || "Goal not set"}{client.city ? ` · ${client.city}` : ""}
              </p>
              {client.googleLinked && client.googleEmail && (
                <p className="text-[12px] text-text-muted mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Linked Google: <span className="text-text-secondary">{client.googleEmail}</span>
                  {client.email && client.googleEmail !== client.email.toLowerCase() && (
                    <span className="text-amber-300">· invited as {client.email}</span>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium ${statusColor}`}>
              {client.status === "ACTIVE" ? <CheckCircleIcon size={12} /> : <WarningIcon size={12} />}
              {statusLabel}
            </span>
            <div className="flex flex-col items-end">
              <Button size="sm" variant="secondary" loading={inviteBusy} onClick={resendInvite}>
                {client.lastInviteSentAt ? "Resend Invite" : "Send WhatsApp Invite"}
              </Button>
              {client.lastInviteSentAt && (
                <span className="text-[11px] text-text-muted mt-1">Invite Sent: {fmtDate(client.lastInviteSentAt)}</span>
              )}
            </div>
            {client.status !== "ARCHIVED" && (
              <Button size="sm" variant="danger" loading={archiveBusy} onClick={archive}>Archive</Button>
            )}
            <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>Delete Client</Button>
          </div>
        </div>
      </Card>

      {/* Stale-invite warning — shown when onboarding info changed before the
          client activated, so the outstanding invite link may be invalid. */}
      {client.inviteNeedsRegeneration && client.status === "PENDING" && !inviteBannerDismissed && (
        <Card className="border-amber-400/30 bg-amber-400/[0.05]">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 text-amber-300 flex items-center justify-center shrink-0">
              <WarningIcon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-200">Invite information has changed</p>
              <p className="text-[13px] text-text-secondary mt-1">
                The current invite link may no longer be valid. Generate a new invite link to share the latest details.
              </p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <Button size="sm" loading={regenBusy} onClick={regenerateInvite}>Generate New Invite Link</Button>
                <Button size="sm" variant="ghost" disabled={regenBusy} onClick={() => setInviteBannerDismissed(true)}>Dismiss</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Freshly regenerated invite link — copyable. */}
      {newInviteUrl && (
        <Card className="border-primary/30 bg-primary/[0.04]">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <CheckCircleIcon size={16} className="text-primary" />
              <p className="text-sm font-semibold text-text-primary">New invite link ready</p>
            </div>
            <button
              onClick={() => setNewInviteUrl(null)}
              className="text-text-muted hover:text-text-primary transition-colors text-sm"
              aria-label="Hide new invite link"
            >
              ×
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              readOnly
              value={newInviteUrl}
              onClick={(e) => e.target.select()}
              className="flex-1 h-9 px-3 rounded-lg bg-surface-elevated border border-border text-[12.5px] font-mono text-text-primary"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                navigator.clipboard?.writeText(newInviteUrl);
                setToast({ kind: "success", message: "Link copied" });
              }}
            >
              Copy link
            </Button>
          </div>
        </Card>
      )}

      <div className="border-b border-border">
        <div className="flex items-center gap-1 overflow-x-auto -mb-px">
          {TABS.map((t) => {
            const badge = t.id === "messages" ? unreadForClient(id) : 0;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={[
                  "h-10 px-4 text-[13.5px] font-medium border-b-2 transition-colors whitespace-nowrap inline-flex items-center gap-2",
                  tab === t.id
                    ? "border-primary text-text-primary"
                    : "border-transparent text-text-muted hover:text-text-primary",
                ].join(" ")}
              >
                {t.label}
                {badge > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-black text-[10px] font-bold leading-none">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {tabContent[tab]}

      <Modal
        isOpen={deleteOpen}
        onClose={() => !deleteBusy && setDeleteOpen(false)}
        title="Delete Client"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" disabled={deleteBusy} onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={deleteBusy} onClick={doDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary leading-relaxed">
          Are you sure you want to delete <span className="font-semibold text-text-primary">{client.name}</span>?
        </p>
        <p className="text-sm text-text-muted mt-2">This action cannot be undone.</p>
      </Modal>

      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default TrainerClientDetailPage;
