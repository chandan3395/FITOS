import { useMemo, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const TRAINERS = [
  { name: "Coach Raj",   email: "raj@fitos.app",   activeClients: 12, totalClients: 14, status: "active",   joined: "Mar 2025", lastActive: "Today" },
  { name: "Coach Maya",  email: "maya@fitos.app",  activeClients: 18, totalClients: 20, status: "active",   joined: "Jan 2025", lastActive: "Today" },
  { name: "Coach Arjun", email: "arjun@fitos.app", activeClients:  8, totalClients: 10, status: "active",   joined: "Apr 2025", lastActive: "Yesterday" },
  { name: "Coach Lina",  email: "lina@fitos.app",  activeClients:  0, totalClients:  6, status: "inactive", joined: "Feb 2025", lastActive: "12d ago" },
  { name: "Coach Dev",   email: "dev@fitos.app",   activeClients:  4, totalClients:  4, status: "active",   joined: "May 2025", lastActive: "Today" },
];

const FILTERS = [
  { id: "all",      label: "All" },
  { id: "active",   label: "Active" },
  { id: "inactive", label: "Inactive" },
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

const AdminTrainersPage = () => {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => TRAINERS.filter((t) => {
    if (filter !== "all" && t.status !== filter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [filter, search]);

  const counts = useMemo(() => ({
    all:      TRAINERS.length,
    active:   TRAINERS.filter((t) => t.status === "active").length,
    inactive: TRAINERS.filter((t) => t.status === "inactive").length,
  }), []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Trainer Management</h2>
          <p className="text-sm text-text-secondary mt-1">
            {counts.all} trainers · {counts.active} active · trainer-level data only (no client PII).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trainers..."
            className="h-9 w-64 px-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#333]"
          />
          <Button>+ Onboard Trainer</Button>
        </div>
      </div>

      {/* Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={[
              "h-8 px-3.5 rounded-full text-[12.5px] font-medium transition-colors inline-flex items-center gap-2",
              filter === f.id
                ? "bg-primary/15 text-primary border border-primary/40"
                : "bg-surface-elevated border border-border text-text-secondary hover:text-text-primary hover:border-[#333]",
            ].join(" ")}
          >
            {f.label}
            <span className={`text-[10.5px] font-semibold ${filter === f.id ? "text-primary" : "text-text-muted"}`}>
              {counts[f.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold tracking-[0.12em] text-text-muted uppercase border-b border-border">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Active Clients</th>
                <th className="px-6 py-3">Total Clients</th>
                <th className="px-6 py-3">Last Activity</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Joined</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.email} className="border-b border-border last:border-0 hover:bg-surface-elevated/40 transition-colors">
                  <td className="px-6 py-3.5 text-text-primary font-medium">{t.name}</td>
                  <td className="px-6 py-3.5 text-text-secondary">{t.email}</td>
                  <td className="px-6 py-3.5 text-text-primary">{t.activeClients}</td>
                  <td className="px-6 py-3.5 text-text-secondary">{t.totalClients}</td>
                  <td className="px-6 py-3.5 text-text-secondary">{t.lastActive}</td>
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-text-secondary">
                    No trainers match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdminTrainersPage;
