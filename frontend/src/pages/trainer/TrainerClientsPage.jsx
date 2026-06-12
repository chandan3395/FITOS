import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { SkeletonGrid, EmptyState, ErrorState } from "../../components/feedback/States";
import clientService from "../../services/clientService";
import { ROUTES } from "../../constants/routes";

// ── view-model helpers ─────────────────────────────────────────
const FILTERS = [
  { id: "all",       label: "All" },
  { id: "active",    label: "Active" },
  { id: "pending",   label: "Pending" },
  { id: "attention", label: "Attention Needed" },
  { id: "archived",  label: "Archived" },
];

/** Map a backend client document → the row shape this grid renders. */
function toRow(c) {
  const status =
    c.status === "ARCHIVED" ? "archived" :
    c.status === "PENDING"  ? "pending"  : "active";
  const weight = c.startingWeight ?? null;
  return {
    id:          c._id,
    name:        c.name,
    goal:        c.goal || "—",
    week:        null,                         // not tracked yet
    status,
    weight,
    change:      0,                            // placeholder until check-ins
    lastCheckIn: "—",                          // placeholder
    bucket:      status,                       // "active" | "archived"
  };
}

const STATUS_META = {
  active:   { label: "Active",   text: "text-emerald-400", bg: "bg-emerald-400/10", dot: "bg-emerald-400" },
  pending:  { label: "Pending",  text: "text-amber-400",   bg: "bg-amber-400/10",   dot: "bg-amber-400" },
  archived: { label: "Archived", text: "text-zinc-500",    bg: "bg-zinc-800",       dot: "bg-zinc-600" },
};

const AVATAR_COLORS = [
  "bg-indigo-500/20 text-indigo-300",
  "bg-violet-500/20 text-violet-300",
  "bg-sky-500/20 text-sky-300",
  "bg-rose-500/20 text-rose-300",
  "bg-teal-500/20 text-teal-300",
  "bg-amber-500/20 text-amber-300",
];
const colorFor = (name = "") => AVATAR_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
const initials = (name = "") => name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

const ChangeBadge = ({ change }) => {
  if (!change) return <span className="text-text-muted">—</span>;
  const up = change > 0;
  return <span className={up ? "text-red-400" : "text-emerald-400"}>{up ? "+" : ""}{change.toFixed(1)}kg</span>;
};

const ClientGridCard = ({ c, onOpen }) => {
  const sm = STATUS_META[c.status] ?? STATUS_META.archived;
  return (
    <button onClick={onOpen} className="text-left card card-hover p-5 flex flex-col gap-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center text-[13px] font-bold ${colorFor(c.name)}`}>
          {initials(c.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-text-primary leading-tight truncate">{c.name}</p>
          <p className="text-[12px] text-text-muted mt-0.5">{c.goal}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${sm.text} ${sm.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
          {sm.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Weight</p>
          <p className="text-sm font-semibold text-text-primary mt-0.5">{c.weight ? `${c.weight}kg` : "—"}</p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Change</p>
          <p className="text-sm font-semibold mt-0.5"><ChangeBadge change={c.change} /></p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Check-in</p>
          <p className="text-sm font-semibold text-text-primary mt-0.5">{c.lastCheckIn}</p>
        </div>
      </div>
    </button>
  );
};

// ── page ──────────────────────────────────────────────────────
const TrainerClientsPage = () => {
  const navigate = useNavigate();

  const [rawClients, setRawClients] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error,   setError]         = useState(null);

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await clientService.list();
      setRawClients(data);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => rawClients.map(toRow), [rawClients]);

  const filtered = useMemo(() => rows.filter((c) => {
    if (filter !== "all" && c.bucket !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [rows, filter, search]);

  const counts = useMemo(() => ({
    all:       rows.length,
    active:    rows.filter((c) => c.bucket === "active").length,
    pending:   rows.filter((c) => c.bucket === "pending").length,
    attention: 0,
    archived:  rows.filter((c) => c.bucket === "archived").length,
  }), [rows]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">All Clients</h2>
          <p className="text-sm text-text-secondary mt-1">
            {loading ? "Loading…" : `${counts.all} total · ${counts.active} active`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="h-9 w-64 pl-9 pr-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#333] transition-colors"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
          </div>
          <Link to={`${ROUTES.TRAINER_CLIENTS}/new`}>
            <Button size="md">+ Add Client</Button>
          </Link>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={[
              "h-8 px-3.5 rounded-full text-[12.5px] font-medium transition-all duration-150 inline-flex items-center gap-2",
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

      {/* States */}
      {loading
        ? <SkeletonGrid count={6} />
        : error
          ? <ErrorState title="Couldn't load clients" message={error} onRetry={load} />
          : filtered.length === 0
            ? (
              <EmptyState
                title={rows.length === 0 ? "No clients yet" : "No clients match this filter"}
                description={rows.length === 0 ? "Get started by adding your first client." : "Try a different filter or search term."}
                action={rows.length === 0 && (
                  <Link to={`${ROUTES.TRAINER_CLIENTS}/new`}>
                    <Button>+ Add Client</Button>
                  </Link>
                )}
              />
            )
            : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((c) => (
                  <ClientGridCard key={c.id} c={c} onOpen={() => navigate(`/trainer/client/${c.id}`)} />
                ))}
              </div>
            )
      }
    </div>
  );
};

export default TrainerClientsPage;
