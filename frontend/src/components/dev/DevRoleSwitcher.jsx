// ─────────────────────────────────────────────────────────────
// DevRoleSwitcher — floating widget that lets you flip between
// mock roles during development. Visible only when DEV_BYPASS is
// active; in production builds this entire component never
// mounts (App.jsx gates the import on DEV_BYPASS too, so it
// tree-shakes out).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../contexts/AuthContext";
import {
  DEV_BYPASS,
  DEV_ROLES,
  getDevClientId,
  setDevClientId,
  subscribeDevClientId,
} from "../../lib/devAuth";
import { ROUTES } from "../../constants/routes";
import api from "../../lib/api";

const ROLE_META = {
  ADMIN:   { label: "Admin",   dest: ROUTES.ADMIN_DASHBOARD,   accent: "text-primary",        bg: "bg-primary/15 border-primary/40" },
  TRAINER: { label: "Trainer", dest: ROUTES.TRAINER_DASHBOARD, accent: "text-emerald-300",    bg: "bg-emerald-400/15 border-emerald-400/40" },
  CLIENT:  { label: "Client",  dest: ROUTES.CLIENT_DASHBOARD,  accent: "text-sky-300",        bg: "bg-sky-400/15 border-sky-400/40" },
};

const DevRoleSwitcher = () => {
  const { devBypass, devRole, setDevRole } = useAuthContext();
  const navigate = useNavigate();

  const [clients, setClients]     = useState([]);
  const [loadingClients, setLC]   = useState(false);
  const [clientId, setClientId]   = useState(getDevClientId());

  // Keep local clientId state in sync with cross-tab / external changes.
  useEffect(() => subscribeDevClientId((id) => setClientId(id)), []);

  // Lazy-load the client list whenever CLIENT mode is active so the
  // dropdown is always fresh after a trainer just added a new client.
  const loadClients = useCallback(async () => {
    setLC(true);
    try {
      const res = await api.get("/dev/clients");
      setClients(res?.data?.data?.clients || []);
    } catch {
      setClients([]);
    } finally {
      setLC(false);
    }
  }, []);

  useEffect(() => {
    if (devRole === "CLIENT") loadClients();
  }, [devRole, loadClients]);

  // Belt-and-braces: even if someone mounts this in prod, render nothing.
  if (!DEV_BYPASS || !devBypass) return null;

  const swap = (role) => {
    console.log("[switcher] swap role ->", role);
    setDevRole(role);
    navigate(ROLE_META[role].dest, { replace: true });
  };

  const pickClient = (id) => {
    console.log("[switcher] pick client ->", id || "(generic)");
    setDevClientId(id || null);
    setClientId(id || null);
    navigate(ROUTES.CLIENT_DASHBOARD, { replace: true });
  };

  return (
    <div
      role="region"
      aria-label="Development role switcher"
      className="fixed bottom-4 right-4 z-50 select-none"
    >
      <div className="bg-surface-elevated/95 backdrop-blur border border-border rounded-2xl shadow-card-lg p-2 w-[280px]">
        <div className="px-2 pt-1 pb-2 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-slow" />
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-amber-300">
            Dev Bypass
          </p>
        </div>
        <div className="flex items-center gap-1">
          {DEV_ROLES.map((role) => {
            const meta = ROLE_META[role];
            const active = devRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => swap(role)}
                className={[
                  "flex-1 h-8 px-3 rounded-lg text-[12px] font-medium border transition-colors",
                  active
                    ? `${meta.bg} ${meta.accent}`
                    : "bg-transparent border-border text-text-secondary hover:text-text-primary hover:border-[#333]",
                ].join(" ")}
              >
                {meta.label}
              </button>
            );
          })}
        </div>

        {devRole === "CLIENT" && (
          <div className="mt-2 px-1 pb-1">
            <label className="block text-[10px] font-semibold tracking-[0.14em] uppercase text-text-muted mb-1.5">
              Impersonate
            </label>
            <div className="flex items-center gap-1.5">
              <select
                value={clientId || ""}
                onChange={(e) => pickClient(e.target.value)}
                className="flex-1 h-8 px-2 rounded-lg bg-surface-elevated border border-border text-[12px] text-text-primary focus:outline-none focus:border-[#333]"
              >
                <option value="">— Generic dev client —</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}{c.status === "ARCHIVED" ? " (archived)" : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={loadClients}
                title="Reload clients"
                className="h-8 px-2 rounded-lg bg-transparent border border-border text-text-secondary hover:text-text-primary text-[12px]"
              >
                {loadingClients ? "…" : "↻"}
              </button>
            </div>
            {clients.length === 0 && !loadingClients && (
              <p className="mt-1.5 text-[10.5px] text-text-muted leading-snug">
                No clients yet — switch to Trainer and add one.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DevRoleSwitcher;
