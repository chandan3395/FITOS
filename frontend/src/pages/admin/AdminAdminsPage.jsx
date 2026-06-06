import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { SkeletonGrid, EmptyState, ErrorState, Toast } from "../../components/feedback/States";
import adminService from "../../services/adminService";
import { useAuthContext } from "../../contexts/AuthContext";

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

const CreateAdminModal = ({ onClose, onCreated }) => {
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
      const admin = await adminService.createAdmin({ name: name.trim(), email: email.trim(), password });
      onCreated(admin);
    } catch (err) {
      if (err?.response?.data?.errors) setFieldErrs(err.response.data.errors);
      else setError(err?.response?.data?.message || err?.message || "Failed to create admin");
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
          <Card.Title>Create Admin</Card.Title>
          <Card.Description>The new admin can log in immediately with these credentials.</Card.Description>
        </Card.Header>
        <Card.Body>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold tracking-[0.08em] text-text-muted uppercase mb-1.5">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls(fieldErrs.name)} placeholder="Sam Operator" />
              {fieldErrs.name && <p className="mt-1 text-[11.5px] text-red-300">{fieldErrs.name}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-semibold tracking-[0.08em] text-text-muted uppercase mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls(fieldErrs.email)} placeholder="sam@fitos.app" />
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
              <Button type="submit" loading={busy}>Create Admin</Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </div>
  );
};

/**
 * AdminAdminsPage — list, create, disable/enable, delete admins. The
 * three safety rules (can't disable self, can't disable/delete last
 * active admin) are enforced server-side; the UI also hides the
 * destructive controls on the row representing the current user so the
 * common case never even surfaces the error.
 */
const AdminAdminsPage = () => {
  const { user: me } = useAuthContext();
  const [admins, setAdmins]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [filter, setFilter]   = useState("all");
  const [search, setSearch]   = useState("");
  const [actingId, setActing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAdmins(await adminService.listAdmins());
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load admins");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => ({
    all:      admins.length,
    active:   admins.filter((a) => a.isActive).length,
    inactive: admins.filter((a) => !a.isActive).length,
  }), [admins]);

  const filtered = useMemo(() => admins.filter((a) => {
    if (filter === "active"   && !a.isActive) return false;
    if (filter === "inactive" &&  a.isActive) return false;
    const q = search.trim().toLowerCase();
    if (q && !a.name.toLowerCase().includes(q) && !a.email.toLowerCase().includes(q)) return false;
    return true;
  }), [admins, filter, search]);

  // Last active admin guard mirrors the server rule so we can dim the
  // disable / delete buttons before the user clicks and gets a 400.
  const activeCount = counts.active;

  const toggle = async (a) => {
    setActing(a._id);
    try {
      const updated = a.isActive
        ? await adminService.disableAdmin(a._id)
        : await adminService.enableAdmin(a._id);
      setAdmins((curr) => curr.map((x) => x._id === a._id ? { ...x, ...updated } : x));
      setToast({ kind: "success", message: a.isActive ? "Admin disabled" : "Admin enabled" });
    } catch (e) {
      setToast({ kind: "error", message: e?.response?.data?.message || "Action failed" });
    } finally {
      setActing(null);
    }
  };

  const remove = async (a) => {
    if (!confirm(`Delete admin "${a.name}"? This is permanent.`)) return;
    setActing(a._id);
    try {
      await adminService.deleteAdmin(a._id);
      setAdmins((curr) => curr.filter((x) => x._id !== a._id));
      setToast({ kind: "success", message: "Admin deleted" });
    } catch (e) {
      setToast({ kind: "error", message: e?.response?.data?.message || "Delete failed" });
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Admin Management</h2>
          <p className="text-sm text-text-secondary mt-1">
            {loading ? "Loading…" : `${counts.all} admins · ${counts.active} active`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search admins..."
            className="h-9 w-64 px-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#333]"
          />
          <Button onClick={() => setShowCreate(true)}>+ Create Admin</Button>
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
          ? <ErrorState title="Couldn't load admins" message={error} onRetry={load} />
          : filtered.length === 0
            ? <EmptyState
                title={admins.length === 0 ? "No admins yet" : "No admins match this filter"}
                description={admins.length === 0 ? "Create another admin to share the workload." : "Try a different filter or search term."}
                action={admins.length === 0 && (
                  <Button onClick={() => setShowCreate(true)}>+ Create Admin</Button>
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
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Joined</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((a) => {
                        const isMe        = String(me?._id) === String(a._id);
                        const isLastActive = a.isActive && activeCount <= 1;
                        // Disable button is hidden when targeting self OR when this is
                        // the only remaining active admin (mirrors server guard).
                        const disableBlocked = a.isActive && (isMe || isLastActive);
                        const deleteBlocked  = isMe || (a.isActive && isLastActive);
                        return (
                          <tr key={a._id} className="border-b border-border last:border-0 hover:bg-surface-elevated/40 transition-colors">
                            <td className="px-6 py-3.5 text-text-primary font-medium">
                              {a.name}
                              {isMe && <span className="ml-2 text-[10px] text-primary uppercase tracking-wider">You</span>}
                            </td>
                            <td className="px-6 py-3.5 text-text-secondary">{a.email}</td>
                            <td className="px-6 py-3.5"><StatusBadge active={a.isActive} /></td>
                            <td className="px-6 py-3.5 text-text-secondary">{fmt(a.createdAt)}</td>
                            <td className="px-6 py-3.5 text-right">
                              <div className="inline-flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant={a.isActive ? "danger" : "secondary"}
                                  disabled={disableBlocked && a.isActive}
                                  title={disableBlocked && a.isActive
                                    ? (isMe ? "You cannot disable your own account" : "Cannot disable the last active admin")
                                    : undefined}
                                  loading={actingId === a._id}
                                  onClick={() => toggle(a)}
                                >
                                  {a.isActive ? "Disable" : "Enable"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={deleteBlocked}
                                  title={deleteBlocked
                                    ? (isMe ? "You cannot delete your own account" : "Cannot delete the last active admin")
                                    : undefined}
                                  loading={actingId === a._id}
                                  onClick={() => remove(a)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )
      }

      {showCreate && (
        <CreateAdminModal
          onClose={() => setShowCreate(false)}
          onCreated={(admin) => {
            setShowCreate(false);
            setAdmins((curr) => [admin, ...curr]);
            setToast({ kind: "success", message: "Admin created" });
          }}
        />
      )}

      <Toast {...(toast || {})} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default AdminAdminsPage;
