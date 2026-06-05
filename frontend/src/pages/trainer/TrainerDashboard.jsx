import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import { MetricCard } from "../../components/design-system";
import {
  UsersIcon,
  CheckCircleIcon,
  ChartBarIcon,
  WarningIcon,
  BoltIcon,
} from "../../components/design-system/Icons";
import { ROUTES } from "../../constants/routes";
import { SkeletonGrid, ErrorState } from "../../components/feedback/States";
import trainerService from "../../services/trainerService";
import clientService from "../../services/clientService";
import checkinService from "../../services/checkinService";

const QUICK_ACTIONS = [
  { label: "Add Client",       Icon: UsersIcon,       accent: "bg-emerald-500/10 text-emerald-300", to: `${ROUTES.TRAINER_CLIENTS}/new` },
  { label: "Review Check-ins", Icon: CheckCircleIcon, accent: "bg-primary/10 text-primary",         to: ROUTES.TRAINER_CHECKINS },
  { label: "All Clients",      Icon: ChartBarIcon,    accent: "bg-violet-500/10 text-violet-300",   to: ROUTES.TRAINER_CLIENTS },
  { label: "Schedule",         Icon: BoltIcon,        accent: "bg-amber-500/10 text-amber-300",     to: ROUTES.TRAINER_SCHEDULE },
];

function formatRelative(iso) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000)          return "just now";
  const m = Math.round(ms / 60_000);
  if (m < 60)               return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24)               return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30)               return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

const TrainerDashboard = () => {
  const navigate = useNavigate();

  const [metrics,  setMetrics]  = useState(null);
  const [clients,  setClients]  = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fire all three in parallel; metrics is the critical one.
      const [m, cs, cis] = await Promise.all([
        trainerService.getMetrics(),
        clientService.list(),
        checkinService.list({ status: "PENDING" }).catch(() => []),
      ]);
      setMetrics(m);
      setClients(cs);
      setCheckins(cis);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build Recent Activity from real check-ins (newest first, up to 5).
  const activity = useMemo(() => {
    return checkins.slice(0, 5).map((c) => ({
      who:  c.clientId?.name || "Client",
      what: `submitted a check-in${c.weight ? ` — ${c.weight} kg` : ""}`,
      time: formatRelative(c.createdAt),
      dot:  c.status === "FLAGGED" ? "bg-red-400" : "bg-emerald-400",
    }));
  }, [checkins]);

  // Attention list = clients with NO check-in in 7d, capped at 3.
  const attention = useMemo(() => {
    if (!clients.length) return [];
    const lastByClient = new Map();
    for (const c of checkins) {
      const id = c.clientId?._id || c.clientId;
      if (!lastByClient.has(String(id))) lastByClient.set(String(id), c.createdAt);
    }
    const now = Date.now();
    return clients
      .filter((cl) => cl.status === "ACTIVE")
      .map((cl) => {
        const last = lastByClient.get(String(cl._id));
        const days = last ? Math.floor((now - new Date(last).getTime()) / 86_400_000) : null;
        return { ...cl, daysSince: days };
      })
      .filter((cl) => cl.daysSince === null || cl.daysSince >= 7)
      .slice(0, 3);
  }, [clients, checkins]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Trainer Dashboard</h2>
          <p className="text-sm text-text-secondary mt-1">Loading…</p>
        </div>
        <SkeletonGrid count={4} columns="lg:grid-cols-4 xl:grid-cols-4" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-text-primary">Trainer Dashboard</h2>
        <ErrorState title="Couldn't load dashboard" message={error} onRetry={load} />
      </div>
    );
  }

  const metricCards = [
    { label: "Active Clients",        value: String(metrics?.activeClients ?? 0),       delta: `${metrics?.totalClients ?? 0} total`,    trend: "neutral", Icon: UsersIcon },
    { label: "Pending Check-ins",     value: String(metrics?.pendingCheckins ?? 0),     delta: metrics?.pendingCheckins ? "Needs review" : "All clear", trend: "neutral", Icon: CheckCircleIcon },
    { label: "Photos Pending Review", value: String(metrics?.photosPendingReview ?? 0), delta: "—",                                       trend: "neutral", Icon: ChartBarIcon },
    { label: "Attention Required",    value: String(attention.length),                   delta: attention.length ? "Flagged"   : "All good", trend: attention.length ? "down" : "neutral", Icon: WarningIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Trainer Dashboard</h2>
          <p className="text-sm text-text-secondary mt-1">Welcome back, Coach. Here&apos;s today at a glance.</p>
        </div>
      </div>

      {/* Row 1 — Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((m) => (
          <MetricCard
            key={m.label}
            label={m.label}
            value={m.value}
            delta={m.delta}
            trend={m.trend}
            icon={<m.Icon size={18} />}
          />
        ))}
      </div>

      {/* Row 2 — Quick Actions */}
      <Card>
        <Card.Header><Card.Title>Quick Actions</Card.Title></Card.Header>
        <Card.Body>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((q) => (
              <button
                key={q.label}
                onClick={() => navigate(q.to)}
                className="group flex flex-col items-center justify-center gap-3 py-6 rounded-xl bg-surface-elevated/40 border border-border hover:border-[#333] hover:bg-surface-elevated transition-all duration-150"
              >
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${q.accent} group-hover:scale-105 transition-transform`}>
                  <q.Icon size={20} />
                </span>
                <span className="text-sm font-medium text-text-primary">{q.label}</span>
              </button>
            ))}
          </div>
        </Card.Body>
      </Card>

      {/* Row 3 — Recent Activity + Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <Card.Title>Recent Activity</Card.Title>
              <Link to={ROUTES.TRAINER_CHECKINS} className="text-[12px] text-primary hover:text-primary-hover transition-colors">
                View all →
              </Link>
            </div>
          </Card.Header>
          <Card.Body>
            {activity.length === 0 ? (
              <p className="text-sm text-text-secondary py-4 text-center">No recent activity yet.</p>
            ) : (
              <ul className="space-y-3.5">
                {activity.map((a, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${a.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] text-text-primary leading-snug">
                        <span className="font-semibold">{a.who}</span>{" "}
                        <span className="text-text-secondary">{a.what}</span>
                      </p>
                      <p className="text-[11px] text-text-muted mt-0.5">{a.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <div>
                <Card.Title>Clients Requiring Attention</Card.Title>
                <Card.Description>No check-in in 7+ days</Card.Description>
              </div>
              <Link to={ROUTES.TRAINER_CLIENTS} className="text-[12px] text-primary hover:text-primary-hover transition-colors">
                View all →
              </Link>
            </div>
          </Card.Header>
          <Card.Body>
            {attention.length === 0 ? (
              <p className="text-sm text-text-secondary py-4 text-center">All clients are on track.</p>
            ) : (
              <div className="space-y-2">
                {attention.map((cl) => (
                  <button
                    key={cl._id}
                    onClick={() => navigate(`/trainer/client/${cl._id}`)}
                    className="w-full text-left p-3 rounded-lg bg-surface-elevated/40 border border-border hover:border-[#333] hover:bg-surface-elevated transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{cl.name}</p>
                        <p className="text-[12px] text-text-muted">{cl.goal || "No goal set"}</p>
                      </div>
                      <span className="text-[11px] text-amber-300 font-medium">
                        {cl.daysSince === null ? "No check-ins" : `${cl.daysSince}d`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default TrainerDashboard;
