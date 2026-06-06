// ─────────────────────────────────────────────────────────────
// DevRoleSwitcher — floating widget that lets you flip between
// mock roles during development. Visible only when DEV_BYPASS is
// active; in production builds this entire component never
// mounts (App.jsx gates the import on DEV_BYPASS too, so it
// tree-shakes out).
// ─────────────────────────────────────────────────────────────

import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../contexts/AuthContext";
import { DEV_BYPASS, DEV_ROLES } from "../../lib/devAuth";
import { ROUTES } from "../../constants/routes";

const ROLE_META = {
  ADMIN:   { label: "Admin",   dest: ROUTES.ADMIN_DASHBOARD,   accent: "text-primary",        bg: "bg-primary/15 border-primary/40" },
  TRAINER: { label: "Trainer", dest: ROUTES.TRAINER_DASHBOARD, accent: "text-emerald-300",    bg: "bg-emerald-400/15 border-emerald-400/40" },
  CLIENT:  { label: "Client",  dest: ROUTES.CLIENT_DASHBOARD,  accent: "text-sky-300",        bg: "bg-sky-400/15 border-sky-400/40" },
};

const DevRoleSwitcher = () => {
  const { devBypass, devRole, setDevRole } = useAuthContext();
  const navigate = useNavigate();

  // Belt-and-braces: even if someone mounts this in prod, render nothing.
  if (!DEV_BYPASS || !devBypass) return null;

  const swap = (role) => {
    setDevRole(role);
    // Navigate to the new role's home so the user immediately lands on a
    // page they're allowed to see. Without this, switching from TRAINER
    // to ADMIN while on /trainer/clients would just trigger RequireAuth
    // to redirect — which still works but isn't as snappy.
    navigate(ROLE_META[role].dest, { replace: true });
  };

  return (
    <div
      role="region"
      aria-label="Development role switcher"
      className="fixed bottom-4 right-4 z-50 select-none"
    >
      <div className="bg-surface-elevated/95 backdrop-blur border border-border rounded-2xl shadow-card-lg p-2">
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
                  "h-8 px-3 rounded-lg text-[12px] font-medium border transition-colors",
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
      </div>
    </div>
  );
};

export default DevRoleSwitcher;
