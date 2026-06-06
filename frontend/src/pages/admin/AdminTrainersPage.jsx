import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { SkeletonGrid, EmptyState, ErrorState, Toast } from "../../components/feedback/States";
import adminService from "../../services/adminService";

const FILTERS = [
  { id: "all",      label: "All" },
  { id: "active",   label: "Active" },
  { id: "inactive", label: "Inactive" },
];

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

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "—";

const CreateTrainerModal = ({ onClose, onCreated }) => {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState(null);
  const [fieldErrs, setFieldErrs] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrs({});
    setBusy(true);
    try {
      const trainer = await adminService.createTrainer({ name: name.trim(), email: email.trim(), password });
      onCreated(trainer);
    } catch (err) {
      if (err?.response?.data?.errors) setFieldErrs(err.response.data.errors);
      else setError(err?.response?.data?.message || err?.message || "Failed to create trainer");
    } finally {
      setBusy(false);
    }
  };

  const inputCls = (bad) =>
    `w-full h-10 px-3 rounded-lg bg-surface-elevated border ${bad ? "border-red-500/50 focus:border-red-400" : "border-border focus:border-[#333]"} text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-colors`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-md">
        <Card.Header>
          <Card.Title>Create Trainer</Card.Title>
          <Card.Description>The trainer can log in immediately with these credentials.</Card.Description>
        </Card.Header>
        <Card.Body>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold tracking-[0.08em] text-text-muted uppercase mb-1.5">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls(fieldErrs.name)} placeholder="Coach Raj" />
              {fieldErrs.name && <p className="mt-1 text-[11.5px] text-red-300">{fieldErrs.name}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-semibold tracking-[0.08em] text-text-muted uppercase mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls(fieldErrs.email)} placeholder="raj@fitos.app" />
              {fieldErrs.email && <p className="mt-1 text-[11.5px] text-red-300">{fieldErrs.email}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-semibold tracking-[0.08em] text-text-muted uppercase mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls(fieldErrs.password)} placeholder="At least 8 characters" autoComplete="new-password" />
              {fieldErrs.password && <p className="mt-1 text-[11.5px] text-red-300">{fieldErrs.password}</p>}
            </div>
            {error && <div className="text-[12.5px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" type="button" onClick={onClose} disabled={busy}>Cancel</Button>
              <Button type="submit" loading={busy}>Create Trainer</Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </div>
  );
};

const AdminTrainersPage = () => {
  const [trainers, setTrainers] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [filter,   setFilter]   = useState("all");
  const [search,   setSearch]   = useState("");
  const [actingId, setActing]   = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast,    setToast]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.listTrainers();
      setTrainers(data);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load trainers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => ({
    all:      trainers.length,
    active:   trainers.filter((t) => t.isActive).length,
    inactive: trainers.filter((t) => !t.isActive).length,
  }), [trainers]);

  const filtered = useMemo(() => trainers.filter((t) => {
    if (filter === "active"   && !t.isActive) return false;
    if (filter === "inactive" &&  t.isActive) return false;
    const q = search.trim().toLowerCase();
    if (q && !t.name.toLowerCase().includes(q) && !t.email.toLowerCase().includes(q)) return false;
    return true;
  }), [trainers, filter, search]);

  const toggle = async (t) => {
    setActing(t._id);
    try {
      const updated = t.isActive
        ? await adminService.disableTrainer(t._id)
        : await adminService.enableTrainer(t._id);
      setTrainers((curr) => curr.map((x) => x._id === t._id ? { ...x, ...updated } : x));
      setToast({ kind: "success", message: t.isActive ? "Trainer disabled" : "Trainer enabled" });
    } catch (e) {
      setToast({ kind: "error", message: e?.response?.data?.message || "Action failed" });
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Trainer Management</h2>
          <p className="text-sm text-text-secondary mt-1">
            {loading ? "Loading…" : `${counts.all} trainers · ${counts.active} active`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trainers..."
            className="h-9 w-64 px-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#333]"
          />
          <Button onClick={() => setShowCreate(true)}>+ Create Trainer</Button>
        </div>
      </div>

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

      {loading
        ? <SkeletonGrid count={4} columns="lg:grid-cols-1 xl:grid-cols-1" />
        : error
          ? <ErrorState title="Couldn't load trainers" message={error} onRetry={load} />
          : filtered.length === 0
            ? <EmptyState
                title={trainers.length === 0 ? "No trainers yet" : "No trainers match this filter"}
                description={trainers.length === 0 ? "Create the first trainer to get started." : "Try a different filter or search term."}
                action={trainers.length === 0 && (
                  <Button onClick={() => setShowCreate(true)}>+ Create Trainer</Button>
                )}
              />
            : (
              <Card padding="none" className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-semibold tracking-[0.12em] text-text-muted uppercase border-b border-border">
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">Email</th>
                        <th className="px-6 py-3">Active Clients</th>
                        <th className="px-6 py-3">Total Clients</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Joined</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((t) => (
                        <tr key={t._id} className="border-b border-border last:border-0 hover:bg-surface-elevated/40 transition-colors">
                          <td className="px-6 py-3.5 text-text-primary font-medium">{t.name}</td>
                          <td className="px-6 py-3.5 text-text-secondary">{t.email}</td>
                          <td className="px-6 py-3.5 text-text-primary">{t.activeClients ?? 0}</td>
                          <td className="px-6 py-3.5 text-text-secondary">{t.totalClients ?? 0}</td>
                          <td className="px-6 py-3.5"><StatusBadge active={t.isActive} /></td>
                          <td className="px-6 py-3.5 text-text-secondary">{fmt(t.createdAt)}</td>
                          <td className="px-6 py-3.5 text-right">
                            <Button
                              size="sm"
                              variant={t.isActive ? "danger" : "secondary"}
                              loading={actingId === t._id}
                              onClick={() => toggle(t)}
                            >
                              {t.isActive ? "Disable" : "Enable"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )
      }

      {showCreate && (
        <CreateTrainerModal
          onClose={() => setShowCreate(false)}
          onCreated={(trainer) => {
            setShowCreate(false);
            setTrainers((curr) => [{ ...trainer, activeClients: 0, totalClients: 0 }, ...curr]);
            setToast({ kind: "success", message: "Trainer created" });
          }}
        />
      )}

      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default AdminTrainersPage;
