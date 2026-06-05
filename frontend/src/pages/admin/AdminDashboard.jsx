import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { MetricCard } from "../../components/design-system";
import { UsersIcon, ChartBarIcon } from "../../components/design-system/Icons";

// Mock — replaced with API data in a later pass.
const PLATFORM_METRICS = [
  { label: "Total Trainers",    value: "42", delta: "+4",  deltaLabel: "this month", trend: "up" },
  { label: "Active Trainers",   value: "38", delta: "90%", deltaLabel: "active rate", trend: "up" },
  { label: "Inactive Trainers", value: "4",  delta: "-2",  deltaLabel: "this month", trend: "down" },
  { label: "Total Clients",     value: "612", delta: "+28", deltaLabel: "this month", trend: "up" },
];

const TRAINERS = [
  { name: "Coach Raj",   email: "raj@fitos.app",    activeClients: 12, status: "active",   joined: "Mar 2025" },
  { name: "Coach Maya",  email: "maya@fitos.app",   activeClients: 18, status: "active",   joined: "Jan 2025" },
  { name: "Coach Arjun", email: "arjun@fitos.app",  activeClients:  8, status: "active",   joined: "Apr 2025" },
  { name: "Coach Lina",  email: "lina@fitos.app",   activeClients:  0, status: "inactive", joined: "Feb 2025" },
];

const RECENT_ACTIVITY = [
  { text: "Coach Maya onboarded 3 new clients",        time: "2h ago" },
  { text: "Coach Raj completed monthly invoice cycle", time: "5h ago" },
  { text: "Coach Arjun account verified",              time: "1d ago" },
  { text: "Coach Lina marked inactive",                time: "2d ago" },
];

const StatusBadge = ({ status }) => {
  const map = {
    active:   { text: "Active",   color: "text-emerald-400", bg: "bg-emerald-400/10", dot: "bg-emerald-400" },
    inactive: { text: "Inactive", color: "text-zinc-500",    bg: "bg-zinc-800",       dot: "bg-zinc-600" },
  };
  const m = map[status] ?? map.inactive;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${m.color} ${m.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.text}
    </span>
  );
};

const AdminDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Platform Dashboard</h2>
          <p className="text-sm text-text-secondary mt-1">Trainer-level analytics — no individual client data.</p>
        </div>
      </div>

      {/* 1 — Platform Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLATFORM_METRICS.map((m) => (
          <MetricCard
            key={m.label}
            label={m.label}
            value={m.value}
            delta={m.delta}
            deltaLabel={m.deltaLabel}
            trend={m.trend}
            icon={<UsersIcon size={18} />}
          />
        ))}
      </div>

      {/* 2 — Trainer Management */}
      <Card padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <Card.Title>Trainer Management</Card.Title>
            <Card.Description>Onboard, view, or disable trainer accounts.</Card.Description>
          </div>
          <Button size="sm" variant="secondary">View All</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold tracking-[0.12em] text-text-muted uppercase border-b border-border">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Active Clients</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Joined</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {TRAINERS.map((t) => (
                <tr key={t.email} className="border-b border-border last:border-0 hover:bg-surface-elevated/40 transition-colors">
                  <td className="px-6 py-3.5 text-text-primary font-medium">{t.name}</td>
                  <td className="px-6 py-3.5 text-text-secondary">{t.email}</td>
                  <td className="px-6 py-3.5 text-text-primary">{t.activeClients}</td>
                  <td className="px-6 py-3.5"><StatusBadge status={t.status} /></td>
                  <td className="px-6 py-3.5 text-text-secondary">{t.joined}</td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button size="sm" variant="ghost">View</Button>
                      <Button size="sm" variant="danger">
                        {t.status === "active" ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 3 — Recent Platform Activity */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <div>
              <Card.Title>Recent Platform Activity</Card.Title>
              <Card.Description>Trainer-related events only.</Card.Description>
            </div>
            <ChartBarIcon size={18} className="text-text-muted" />
          </div>
        </Card.Header>
        <Card.Body>
          <ul className="space-y-3">
            {RECENT_ACTIVITY.map((e, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span className="text-text-primary">{e.text}</span>
                </div>
                <span className="text-[12px] text-text-muted">{e.time}</span>
              </li>
            ))}
          </ul>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AdminDashboard;
