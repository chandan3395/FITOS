import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { WarningIcon } from "../../components/design-system/Icons";
import { SkeletonGrid, EmptyState, ErrorState, Toast } from "../../components/feedback/States";
import checkinService from "../../services/checkinService";

const TABS = [
  { id: "PENDING",  label: "Pending"         },
  { id: "REVIEWED", label: "Reviewed"        },
  { id: "FLAGGED",  label: "Action Required" },
];

const initials = (name = "") => name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "C";

const Metric = ({ label, value, accent }) => (
  <div className="text-center">
    <p className={`text-base font-bold ${accent || "text-text-primary"}`}>{value ?? "—"}</p>
    <p className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">{label}</p>
  </div>
);

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const TrainerCheckinsPage = () => {
  const [tab, setTab]       = useState("PENDING");
  const [allItems, setAll]  = useState([]);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState(null);
  const [actingId, setActing] = useState(null);
  const [toast, setToast]   = useState(null);

  // Single fetch — load everything once, then partition by status client-side
  // so the tab counts are always accurate (previous code only loaded the
  // active tab's items, leaving the other counters frozen at 0).
  const load = useCallback(async () => {
    setLoad(true);
    setError(null);
    try {
      const data = await checkinService.list({ limit: 200 });
      setAll(data);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load check-ins");
    } finally {
      setLoad(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c = { PENDING: 0, REVIEWED: 0, FLAGGED: 0 };
    for (const item of allItems) {
      if (c[item.status] != null) c[item.status] += 1;
    }
    return c;
  }, [allItems]);

  const items = useMemo(
    () => allItems.filter((c) => c.status === tab),
    [allItems, tab]
  );

  async function act(id, status, label) {
    setActing(id);
    try {
      const updated = await checkinService.review(id, { status });
      // Patch the row in place so the counts on the other tabs increment
      // immediately without a refetch.
      setAll((curr) => curr.map((c) => (c._id === id ? { ...c, ...updated } : c)));
      setToast({ kind: "success", message: `Check-in ${label}` });
    } catch (e) {
      setToast({ kind: "error", message: e?.response?.data?.message || "Action failed" });
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">Check-in Reviews</h2>
        <p className="text-sm text-text-secondary mt-1">Review, approve, or flag weekly submissions.</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              "h-9 px-4 rounded-full text-[13px] font-medium transition-all duration-150 inline-flex items-center gap-2",
              tab === t.id
                ? "bg-primary/15 text-primary border border-primary/40"
                : "bg-surface-elevated border border-border text-text-secondary hover:text-text-primary hover:border-[#333]",
            ].join(" ")}
          >
            {t.label}
            <span className={`text-[11px] font-semibold ${tab === t.id ? "text-primary" : "text-text-muted"}`}>
              {counts[t.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {loading
        ? <SkeletonGrid count={3} columns="lg:grid-cols-1 xl:grid-cols-1" />
        : error
          ? <ErrorState title="Couldn't load check-ins" message={error} onRetry={load} />
          : items.length === 0
            ? <EmptyState
                title={
                  tab === "PENDING"  ? "No pending check-ins" :
                  tab === "REVIEWED" ? "No reviewed check-ins" :
                                       "Nothing needs action"
                }
                description={tab === "PENDING" ? "All caught up — clients have no unreviewed submissions." : "Nothing in this bucket yet."}
              />
            : (
              <div className="space-y-4">
                {items.map((s) => {
                  const clientName = s.clientId?.name || "Client";
                  return (
                    <Card key={s._id}>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-sky-500/20 text-sky-300 flex items-center justify-center text-sm font-bold">
                            {initials(clientName)}
                          </div>
                          <div>
                            <p className="text-base font-semibold text-text-primary">{clientName}</p>
                            <p className="text-[12px] text-text-muted">{formatDate(s.createdAt)}</p>
                            {s.status === "FLAGGED" && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-400/10 text-red-300 text-[11px] font-medium mt-2">
                                <WarningIcon size={11} /> Flagged
                              </span>
                            )}
                          </div>
                        </div>

                        {tab === "PENDING" && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="danger"
                              loading={actingId === s._id}
                              onClick={() => act(s._id, "FLAGGED", "flagged")}
                            >
                              Flag
                            </Button>
                            <Button
                              size="sm"
                              loading={actingId === s._id}
                              onClick={() => act(s._id, "REVIEWED", "approved")}
                            >
                              Approve
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="mt-5 grid grid-cols-3 sm:grid-cols-6 gap-4 pt-4 border-t border-border">
                        <Metric label="Weight (kg)" value={s.weight} accent={s.status === "FLAGGED" ? "text-red-400" : "text-text-primary"} />
                        <Metric label="Sleep"  value={s.sleep != null ? `${s.sleep}h` : null} />
                        <Metric label="Water"  value={s.water != null ? `${s.water}L` : null} />
                        <Metric label="Energy" value={s.energy != null ? `${s.energy}/5` : null} />
                        <Metric label="Mood"   value={s.mood != null ? `${s.mood}/5` : null} />
                        <Metric label="Status" value={s.status} />
                      </div>

                      {s.notes && (
                        <p className="mt-4 text-[13px] text-text-secondary border-t border-border pt-4">
                          <span className="text-text-muted">Client note: </span>{s.notes}
                        </p>
                      )}
                      {s.trainerComment && (
                        <p className="mt-2 text-[13px] text-text-primary bg-primary/5 border border-primary/20 rounded-lg p-3">
                          <span className="text-primary font-semibold">Your reply: </span>{s.trainerComment}
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            )
      }

      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default TrainerCheckinsPage;
