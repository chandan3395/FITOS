import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../lib/api";
const button =
  "min-h-11 rounded-xl border border-border px-4 py-2 disabled:opacity-50 hover:border-primary focus-visible:outline-primary";
const field = "mt-1 w-full min-h-11 rounded-xl border border-border bg-bg px-3 py-2";
const date = (value) => (value ? new Date(value).toLocaleString() : "No activity recorded");
export default function AdminByotUsersPage() {
  const [query, setQuery] = useState({ page: 1, limit: 20, search: "", status: "all" });
  const [search, setSearch] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(null);
  const epoch = useRef(0);
  const acting = useRef(false);
  const load = useCallback(async () => {
    const generation = ++epoch.current;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/byot-users", { params: query });
      if (generation === epoch.current) setData(res.data.data);
    } catch (err) {
      if (generation === epoch.current)
        setError(err.response?.data?.message || "Unable to load BYOT accounts. Try again.");
    } finally {
      if (generation === epoch.current) setLoading(false);
    }
  }, [query]);
  useEffect(() => {
    const guard = epoch;
    load();
    return () => {
      guard.current++;
    };
  }, [load]);
  async function change(user) {
    if (acting.current) return;
    const verb = user.isActive ? "Disable" : "Enable";
    if (
      !window.confirm(
        `${verb} ${user.name}? ${user.isActive ? "Their sessions will be revoked. Their records and photos will be preserved." : "They will need to sign in again. Revoked sessions will stay invalid."}`
      )
    )
      return;
    acting.current = true;
    setBusy(user._id);
    setNotice("");
    setError("");
    try {
      await api.patch(`/admin/byot-users/${user._id}`, {
        isActive: !user.isActive,
        expectedIsActive: user.isActive,
      });
      setNotice(`Account ${user.isActive ? "disabled" : "enabled"}.`);
      await load();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Action failed. Reload the list to verify the status before retrying."
      );
    } finally {
      acting.current = false;
      setBusy(null);
    }
  }
  return (
    <section className="space-y-5 min-w-0">
      <h2 className="text-2xl font-semibold">BYOT Users</h2>
      <p className="text-text-secondary">
        Manage account access. Personal fitness records and photos are private to their owner.
      </p>
      <form
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (acting.current) return;
          setQuery((q) => ({ ...q, page: 1, search }));
        }}
      >
        <label className="text-sm">
          Search name or email
          <input
            className={field}
            maxLength={100}
            disabled={!!busy}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button className={button} disabled={!!busy}>
          Search
        </button>
        <label className="text-sm">
          Account status
          <select
            className={field}
            value={query.status}
            disabled={!!busy}
            onChange={(e) => setQuery((q) => ({ ...q, page: 1, status: e.target.value }))}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>
        <label className="text-sm">
          Accounts per page
          <select
            className={field}
            value={query.limit}
            disabled={!!busy}
            onChange={(e) => setQuery((q) => ({ ...q, page: 1, limit: Number(e.target.value) }))}
          >
            {[20, 50, 100].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </form>
      {error && (
        <div role="alert" className="border border-border p-4 rounded-xl">
          <p>{error}</p>
          <button className={`${button} mt-2`} onClick={load} disabled={!!busy}>
            Reload list
          </button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {loading ? (
        <p role="status">Loading BYOT accounts…</p>
      ) : (
        data && (
          <>
            <p className="text-sm text-text-secondary">
              {data.total} accounts · Newest signup first
            </p>
            {!data.items.length && (
              <p>No BYOT accounts match. Try another search or status filter.</p>
            )}
            <div className="grid lg:grid-cols-2 gap-4">
              {data.items.map((u) => (
                <article
                  key={u._id}
                  className="rounded-2xl bg-surface border border-border p-5 min-w-0"
                >
                  <h3 className="font-semibold break-words">{u.name}</h3>
                  <p className="text-text-secondary break-all">{u.email}</p>
                  <dl className="text-sm mt-4 space-y-2">
                    <div>
                      <dt className="text-text-muted">BYOT signup date</dt>
                      <dd>{date(u.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-text-muted">Last activity</dt>
                      <dd>{date(u.lastActiveAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-text-muted">Account status</dt>
                      <dd>{u.isActive ? "Active" : "Disabled"}</dd>
                    </div>
                  </dl>
                  <button
                    className={`${button} mt-4`}
                    disabled={!!busy}
                    onClick={() => change(u)}
                    aria-label={`${u.isActive ? "Disable" : "Enable"} ${u.name}`}
                  >
                    {busy === u._id ? "Saving…" : u.isActive ? "Disable" : "Enable"}
                  </button>
                </article>
              ))}
            </div>
            <nav aria-label="BYOT account pagination" className="flex flex-wrap items-center gap-3">
              <button
                className={button}
                disabled={query.page === 1 || !!busy}
                onClick={() => setQuery((q) => ({ ...q, page: q.page - 1 }))}
              >
                Previous
              </button>
              <span>
                Page {query.page} of {Math.max(1, data.pages)}
              </span>
              <button
                className={button}
                disabled={query.page >= data.pages || !!busy}
                onClick={() => setQuery((q) => ({ ...q, page: q.page + 1 }))}
              >
                Next
              </button>
            </nav>
          </>
        )
      )}
    </section>
  );
}
