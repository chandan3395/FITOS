import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import {
  FlameIcon,
  CheckCircleIcon,
  WarningIcon,
} from "../../components/design-system/Icons";
import { ROUTES } from "../../constants/routes";
import { SkeletonDetail, ErrorState, EmptyState, Toast } from "../../components/feedback/States";
import clientService from "../../services/clientService";
import checkinService from "../../services/checkinService";
import progressPhotoService from "../../services/progressPhotoService";
import ComparePhotos from "../../components/progress/ComparePhotos";
import WorkoutPlanTab from "./WorkoutPlanTab";
import NutritionPlanTab from "./NutritionPlanTab";

const TABS = [
  { id: "overview",  label: "Overview" },
  { id: "checkins",  label: "Check-ins" },
  { id: "photos",    label: "Progress Photos" },
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

// ── OVERVIEW ────────────────────────────────────────────────────
const OverviewTab = ({ client, lastCheckIn }) => {
  const current = lastCheckIn?.weight ?? client.startingWeight ?? null;
  const change  = current && client.startingWeight ? (current - client.startingWeight).toFixed(1) : null;
  const dob     = client.dob ? new Date(client.dob).toLocaleDateString() : null;
  const startDt = client.startDate ? new Date(client.startDate).toLocaleDateString() : null;

  const hasHealth = client.medicalConditions || client.medications || client.pastInjuries || client.allergies;

  return (
    <div className="space-y-4">
      {/* Goal snapshot */}
      <Card>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <KV label="Goal"     value={client.goal} />
          <KV label="Starting" value={client.startingWeight ? `${client.startingWeight} kg` : null} />
          <KV label="Current"  value={current ? `${current} kg` : null} />
          <KV label="Target"   value={client.targetWeight ? `${client.targetWeight} kg` : null} accent="text-primary" />
        </div>
      </Card>

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
            <KV label="Height"          value={client.height ? `${client.height} cm` : null} />
            <KV label="Body Fat"        value={client.bodyFat != null ? `${client.bodyFat} %` : null} />
            <KV label="Target Body Fat" value={client.targetBodyFat != null ? `${client.targetBodyFat} %` : null} />
            <KV label="Age"             value={client.age ? `${client.age} yrs` : null} />
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
          {client.goalDescription && (
            <div className="mt-5">
              <p className="text-[11px] font-semibold tracking-[0.08em] text-text-muted uppercase mb-2">Goal Description</p>
              <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{client.goalDescription}</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Personal */}
      <Card>
        <Card.Header><Card.Title>Personal</Card.Title></Card.Header>
        <Card.Body>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <KV label="Phone"       value={client.phone} />
            <KV label="Email"       value={client.email} />
            <KV label="City"        value={client.city} />
            <KV label="Occupation"  value={client.occupation} />
            <KV label="Gender"      value={client.gender} />
            <KV label="Date of birth" value={dob} />
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

// ── Notes tab — renders the trainer-private notes captured at onboarding.
const NotesPlanTab = ({ client }) => (
  <Card>
    <Card.Header>
      <Card.Title>Private Trainer Notes</Card.Title>
      <Card.Description>Only visible to you. Captured during onboarding.</Card.Description>
    </Card.Header>
    <Card.Body>
      {client.privateNotes
        ? <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{client.privateNotes}</p>
        : <EmptyState title="No notes recorded" description="Add notes from the Add Client wizard or future edit flow." />
      }
    </Card.Body>
  </Card>
);

// ── Messages tab — premium trainer⇄client chat. ────────────────────
// DEMO-ONLY: there is no backend, socket, or persistence. The thread lives
// entirely in local React state and resets on reload. It exists purely to
// showcase what FITOS messaging looks like during a client presentation.
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// Seed a realistic coaching conversation, timestamped relative to "now"
// so it always reads as a fresh, same-day thread in the demo.
function seedMessages(firstName) {
  const now = Date.now();
  const m = 60 * 1000;
  return [
    { id: "s1", from: "trainer", text: `Hey ${firstName}! Great work crushing this week's sessions 💪 How are you feeling?`, time: new Date(now - 322 * m) },
    { id: "s2", from: "client",  text: "Honestly feeling stronger! The new push day was tough but I really enjoyed it.", time: new Date(now - 313 * m) },
    { id: "s3", from: "trainer", text: "That's exactly what I like to hear. Did you manage to hit your protein target most days?", time: new Date(now - 305 * m) },
    { id: "s4", from: "client",  text: "Most days yes — came up a little short on Wednesday but I logged everything in the app.", time: new Date(now - 298 * m) },
    { id: "s5", from: "trainer", text: "Perfect — consistency over perfection. I'll tweak Thursday's plan slightly. Keep the water up too 💧", time: new Date(now - 142 * m) },
    { id: "s6", from: "client",  text: "Will do! Quick one — can we move the Saturday session to Sunday this week?", time: new Date(now - 46 * m) },
    { id: "s7", from: "trainer", text: "Absolutely, Sunday 9am works great. I'll update your schedule now.", time: new Date(now - 7 * m) },
  ];
}

const MessagesTab = ({ client }) => {
  const firstName = (client?.name || "Client").split(" ")[0];
  const [messages, setMessages] = useState(() => seedMessages(firstName));
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);

  // Auto-scroll the thread (not the page) to the newest message.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, from: "trainer", text, time: new Date() },
    ]);
    setDraft("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <Card padding="none" className="overflow-hidden flex flex-col">
      {/* Conversation header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[13px] font-bold">
            {initials(client?.name) || "C"}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary border-2 border-card" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">{client?.name || "Client"}</p>
          <p className="text-[12px] text-primary flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Active now
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-text-muted">
          <button className="w-9 h-9 rounded-xl hover:bg-surface-elevated hover:text-text-primary flex items-center justify-center transition-colors" aria-label="Call">
            <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M6 3.5C6 3 5.5 2.5 5 2.5H3.2c-.6 0-1.1.5-1 1.2C2.7 9 7 13.3 12.3 15.8c.7.3 1.2-.2 1.2-.9V13c0-.5-.5-1-1-1l-2 .5c-1.6-.8-2.9-2.1-3.7-3.7L7 6.8c0-.5.3-.8 0-1.3L6 3.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
          </button>
          <button className="w-9 h-9 rounded-xl hover:bg-surface-elevated hover:text-text-primary flex items-center justify-center transition-colors" aria-label="More">
            <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><circle cx="4" cy="9" r="1.3" fill="currentColor"/><circle cx="9" cy="9" r="1.3" fill="currentColor"/><circle cx="14" cy="9" r="1.3" fill="currentColor"/></svg>
          </button>
        </div>
      </div>

      {/* Thread */}
      <div ref={listRef} className="h-[460px] overflow-y-auto px-5 py-5 space-y-4 bg-bg/40">
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Today</p>

        {messages.map((msg) => {
          const isTrainer = msg.from === "trainer";
          return isTrainer ? (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[80%] sm:max-w-[72%] flex flex-col items-end gap-1">
                <div className="rounded-2xl rounded-br-md bg-primary text-black px-4 py-2.5 text-sm leading-relaxed shadow-glow-sm">
                  {msg.text}
                </div>
                <span className="text-[11px] text-text-muted pr-1">You · {fmtTime(msg.time)}</span>
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex justify-start items-end gap-2.5">
              <div className="w-8 h-8 shrink-0 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[11px] font-bold">
                {initials(client?.name) || "C"}
              </div>
              <div className="max-w-[80%] sm:max-w-[72%] flex flex-col items-start gap-1">
                <div className="rounded-2xl rounded-bl-md bg-surface-elevated border border-border text-text-primary px-4 py-2.5 text-sm leading-relaxed">
                  {msg.text}
                </div>
                <span className="text-[11px] text-text-muted pl-1">{firstName} · {fmtTime(msg.time)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`Message ${firstName}…`}
            className="flex-1 h-11 px-4 rounded-xl bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
          <Button onClick={send} disabled={!draft.trim()} className="px-4" aria-label="Send message">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M16 2L8 10M16 2l-5 14-3-6-6-3 14-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Send
          </Button>
        </div>
        <p className="text-[11px] text-text-muted mt-2 pl-1">Press Enter to send · Shift+Enter for a new line</p>
      </div>
    </Card>
  );
};

// ── PAGE ────────────────────────────────────────────────────────
const TrainerClientDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");

  const [client, setClient]   = useState(null);
  const [checkins, setCins]   = useState([]);
  const [photos, setPhotos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [archiveBusy, setArc] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [toast, setToast]     = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await clientService.getById(id);
      setClient(c);
      const [cins, pics] = await Promise.all([
        checkinService.list({ clientId: id }).catch(() => []),
        progressPhotoService.listForClient(id).catch(() => []),
      ]);
      setCins(cins);
      setPhotos(pics);
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
  const statusLabel = client.status === "ARCHIVED" ? "Archived" : "Active";
  const statusColor = client.status === "ARCHIVED" ? "bg-zinc-800 text-zinc-400" : "bg-emerald-400/10 text-emerald-300";

  const tabContent = {
    overview:  <OverviewTab client={client} lastCheckIn={lastCheckIn} />,
    checkins:  <CheckinsTab clientId={id} items={checkins} loading={false} error={null} onReload={reloadCheckins} />,
    photos:    <PhotosTab   clientId={id} items={photos}   loading={false} error={null} onReload={reloadPhotos}   />,
    workout:   <WorkoutPlanTab clientId={id} />,
    nutrition: <NutritionPlanTab clientId={id} />,
    notes:     <NotesPlanTab     client={client} />,
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
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium ${statusColor}`}>
              {client.status === "ARCHIVED" ? <WarningIcon size={12} /> : <CheckCircleIcon size={12} />}
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
          </div>
        </div>
      </Card>

      <div className="border-b border-border">
        <div className="flex items-center gap-1 overflow-x-auto -mb-px">
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

      {tabContent[tab]}

      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default TrainerClientDetailPage;
