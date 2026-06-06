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
import WorkoutPlanTab from "./WorkoutPlanTab";
import NutritionPlanTab from "./NutritionPlanTab";

const TABS = [
  { id: "overview",  label: "Overview" },
  { id: "checkins",  label: "Check-ins" },
  { id: "photos",    label: "Progress Photos" },
  { id: "workout",   label: "Workout Plan" },
  { id: "nutrition", label: "Nutrition Plan" },
  { id: "notes",     label: "Notes" },
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
        <Card.Header><Card.Title>Upload Photos</Card.Title></Card.Header>
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
                        <p className="text-[12px] text-text-muted mt-1">{fmtDate(p.createdAt)}</p>
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
                        const url = p[`${slot}Photo`];
                        return (
                          <div key={slot} className="aspect-square rounded-xl bg-surface-elevated border border-border overflow-hidden flex items-center justify-center text-text-muted text-[12px]">
                            {url
                              ? <a href={url} target="_blank" rel="noreferrer" className="block w-full h-full"><img src={url} alt={slot} className="w-full h-full object-cover" /></a>
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
