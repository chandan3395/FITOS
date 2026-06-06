import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { MetricCard } from "../../components/design-system";
import { UsersIcon } from "../../components/design-system/Icons";
import { SkeletonGrid, ErrorState, EmptyState } from "../../components/feedback/States";
import adminService from "../../services/adminService";
import { ROUTES } from "../../constants/routes";

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "—";

const StatusBadge = ({ active }) => {
  const meta = active
    ? { text: "Active",   color: "text-emerald-400", bg: "bg-emerald-400/10", dot: "bg-emerald-400" }
    : { text: "Inactive", color: "text-zinc-500",    bg: "bg-zinc-800",       dot: "bg-zinc-600" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${meta.color} ${meta.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.text}
    </span>
  );
};

const AdminDashboard = () => {
  const [metrics, setMetrics]   = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, t] = await Promise.all([
        adminService.getPlatformMetrics(),
        adminService.listTrainers(),
      ]);
      setMetrics(m);
      setTrainers(t);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Platform Dashboard</h2>
          <p className="text-sm text-text-secondary mt-1">Loading…</p>
        </div>
        <SkeletonGrid count={4} columns="lg:grid-cols-4 xl:grid-cols-4" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-text-primary">Platform Dashboard</h2>
        <ErrorState title="Couldn't load dashboard" message={error} onRetry={load} />
      </div>
    );
  }

  const m = metrics || {};
  const metricCards = [
    { label: "Total Trainers",    value: String(m.totalTrainers ?? 0)    },
    { label: "Active Trainers",   value: String(m.activeTrainers ?? 0)   },
    { label: "Inactive Trainers", value: String(m.inactiveTrainers ?? 0) },
    { label: "Total Clients",     value: String(m.totalClients ?? 0)     },
  ];

  const topTrainers = trainers.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Platform Dashboard</h2>
          <p className="text-sm text-text-secondary mt-1">Trainer-level analytics — no individual client data.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((mc) => (
          <MetricCard
            key={mc.label}
            label={mc.label}
            value={mc.value}
            trend="neutral"
            icon={<UsersIcon size={18} />}
          />
        ))}
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <Card.Title>Trainers</Card.Title>
            <Card.Description>Most recently onboarded first.</Card.Description>
          </div>
          <Link to={ROUTES.ADMIN_TRAINERS}>
            <Button size="sm" variant="secondary">Manage all →</Button>
          </Link>
        </div>

        {topTrainers.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No trainers yet"
              description="Create the first trainer from the Trainer Management page."
              action={
                <Link to={ROUTES.ADMIN_TRAINERS}>
                  <Button>+ Create Trainer</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold tracking-[0.12em] text-text-muted uppercase border-b border-border">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Active Clients</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {topTrainers.map((t) => (
                  <tr key={t._id} className="border-b border-border last:border-0">
                    <td className="px-6 py-3.5 text-text-primary font-medium">{t.name}</td>
                    <td className="px-6 py-3.5 text-text-secondary">{t.email}</td>
                    <td className="px-6 py-3.5 text-text-primary">{t.activeClients ?? 0}</td>
                    <td className="px-6 py-3.5"><StatusBadge active={t.isActive} /></td>
                    <td className="px-6 py-3.5 text-text-secondary">{fmt(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminDashboard;
