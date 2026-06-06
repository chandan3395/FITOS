import { useCallback, useEffect, useRef, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { EmptyState, ErrorState, SkeletonDetail, Toast } from "../../components/feedback/States";
import checkinService from "../../services/checkinService";
import progressPhotoService from "../../services/progressPhotoService";

/**
 * ClientProgressPage — reads:
 *   GET /api/checkins/me          (own check-in history)
 *   GET /api/progress-photos/me   (own photo sets, grouped by week)
 *
 * Replaces the previous static placeholder. Also lets the client upload
 * their own weekly photos — backend enforces one-set-per-week with
 * upsert semantics, so re-uploading replaces existing slots.
 */
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

const BADGE = {
  PENDING:  { label: "Pending review", cls: "bg-amber-400/10 text-amber-300" },
  REVIEWED: { label: "Reviewed",       cls: "bg-emerald-400/10 text-emerald-300" },
  FLAGGED:  { label: "Flagged",        cls: "bg-red-500/10 text-red-300" },
};
const StatusBadge = ({ status }) => {
  const meta = BADGE[status] || BADGE.PENDING;
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${meta.cls}`}>
      {meta.label}
    </span>
  );
};

const uploaderLabel = (photo) => {
  const role = photo.uploaderRole;
  if (role === "CLIENT")  return "Uploaded by you";
  if (role === "TRAINER") return `Uploaded by ${photo.uploadedBy?.name || "your coach"}`;
  if (role === "ADMIN")   return "Uploaded by admin";
  return "Uploaded";
};

const ClientProgressPage = () => {
  const [checkins, setCheckins] = useState([]);
  const [photos, setPhotos]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [toast, setToast]       = useState(null);

  const formRef = useRef(null);
  const [week, setWeek]   = useState("");
  const [files, setFiles] = useState({ front: null, side: null, back: null });
  const [uploading, setUp] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [cks, pcs] = await Promise.all([
        checkinService.listMine({ limit: 50 }).catch(() => []),
        progressPhotoService.listMine().catch(() => []),
      ]);
      setCheckins(cks);
      setPhotos(pcs);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load your progress");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!week) return setToast({ kind: "error", message: "Week number is required" });
    if (!files.front && !files.side && !files.back) {
      return setToast({ kind: "error", message: "Pick at least one photo (front, side, or back)" });
    }
    setUp(true);
    try {
      await progressPhotoService.upload({ weekNumber: Number(week), ...files });
      setFiles({ front: null, side: null, back: null });
      setWeek("");
      if (formRef.current) formRef.current.reset();
      setToast({ kind: "success", message: "Photos uploaded" });
      await load();
    } catch (err) {
      setToast({ kind: "error", message: err?.response?.data?.message || "Upload failed" });
    } finally {
      setUp(false);
    }
  };

  if (loading) return <SkeletonDetail />;
  if (error)   return <ErrorState title="Couldn't load your progress" message={error} onRetry={load} />;

  const latestWeight = checkins.find((c) => c.weight != null)?.weight;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">My Progress</h2>
        <p className="text-sm text-text-secondary mt-1">Weight journey, weekly check-ins, and progress photos.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <Card.Body>
            <p className="text-[11px] uppercase tracking-wider text-text-muted">Latest Weight</p>
            <p className="text-2xl font-semibold text-text-primary mt-1">
              {latestWeight != null ? `${latestWeight} kg` : "—"}
            </p>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <p className="text-[11px] uppercase tracking-wider text-text-muted">Check-ins</p>
            <p className="text-2xl font-semibold text-text-primary mt-1">{checkins.length}</p>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <p className="text-[11px] uppercase tracking-wider text-text-muted">Photo Sets</p>
            <p className="text-2xl font-semibold text-text-primary mt-1">{photos.length}</p>
          </Card.Body>
        </Card>
      </div>

      {/* Upload */}
      <Card>
        <Card.Header>
          <Card.Title>Upload Photos</Card.Title>
          <Card.Description>One set per week — re-uploading the same week replaces the slot.</Card.Description>
        </Card.Header>
        <Card.Body>
          <form ref={formRef} onSubmit={submit} className="space-y-3">
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

      {/* Photos grouped by week */}
      <Card>
        <Card.Header>
          <Card.Title>Progress Photos</Card.Title>
          <Card.Description>Newest week first.</Card.Description>
        </Card.Header>
        <Card.Body>
          {photos.length === 0 ? (
            <EmptyState
              title="No progress photos yet"
              description="Upload your first weekly set above. Each set can include a front, side, and back photo."
            />
          ) : (
            <div className="space-y-4">
              {photos.map((p) => (
                <div key={p._id} className="rounded-xl border border-border p-4 bg-surface-elevated">
                  <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-text-primary">Week {p.weekNumber}</p>
                        <StatusBadge status={p.status} />
                      </div>
                      <p className="text-[12px] text-text-muted mt-1">
                        {fmtDate(p.createdAt)} · {uploaderLabel(p)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {["front", "side", "back"].map((slot) => {
                      const url = p[`${slot}Photo`];
                      return (
                        <div key={slot} className="aspect-square rounded-lg bg-surface border border-border overflow-hidden flex items-center justify-center text-text-muted text-[12px]">
                          {url
                            ? <a href={url} target="_blank" rel="noreferrer" className="block w-full h-full"><img src={url} alt={slot} className="w-full h-full object-cover" /></a>
                            : <span className="capitalize">{slot} — none</span>
                          }
                        </div>
                      );
                    })}
                  </div>
                  {p.comment && (
                    <p className="mt-3 text-[13px] text-text-primary bg-primary/5 border border-primary/20 rounded-lg p-3">
                      <span className="text-primary font-semibold">Coach: </span>{p.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Check-in history */}
      <Card>
        <Card.Header>
          <Card.Title>Check-in History</Card.Title>
          <Card.Description>Your weekly submissions to your coach.</Card.Description>
        </Card.Header>
        <Card.Body>
          {checkins.length === 0 ? (
            <p className="text-sm text-text-muted py-4">No check-ins submitted yet.</p>
          ) : (
            <div className="space-y-2">
              {checkins.map((c) => (
                <div key={c._id} className="rounded-lg bg-surface-elevated border border-border px-3 py-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm font-semibold text-text-primary">{fmtDate(c.createdAt)}</p>
                    <span className="text-[11px] text-text-muted uppercase">{c.status}</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-sm mt-2">
                    <div><span className="text-text-muted text-[11px]">Weight</span><br/>{c.weight ?? "—"}</div>
                    <div><span className="text-text-muted text-[11px]">Sleep</span><br/>{c.sleep ?? "—"}</div>
                    <div><span className="text-text-muted text-[11px]">Water</span><br/>{c.water ?? "—"}</div>
                    <div><span className="text-text-muted text-[11px]">Energy</span><br/>{c.energy ?? "—"}</div>
                    <div><span className="text-text-muted text-[11px]">Mood</span><br/>{c.mood ?? "—"}</div>
                  </div>
                  {c.trainerComment && (
                    <p className="mt-3 text-[13px] text-text-primary bg-primary/5 border border-primary/20 rounded-lg p-2.5">
                      <span className="text-primary font-semibold">Coach: </span>{c.trainerComment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default ClientProgressPage;
