import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../contexts/AuthContext";
import { ROUTES } from "../../constants/routes";

/**
 * QASwitcher — DEVELOPMENT-ONLY quick-login panel.
 *
 * This is NOT an auth bypass. Each button performs a REAL login against
 * POST /api/auth/login using seeded QA accounts (see
 * backend/scripts/seed-qa-users.js), receives a real JWT, and stores it
 * through the normal AuthContext flow. All requests still pass through the
 * real auth middleware with real permissions.
 *
 * Rendering is gated in App.jsx on import.meta.env.DEV || VITE_SHOW_QA_TOOLS,
 * so production builds never mount it.
 *
 * Credentials must match the seed script's QA_PASSWORD (default below).
 */

const QA_PASSWORD = import.meta.env.VITE_QA_PASSWORD || "qa-password-123";

// Admin uses the dedicated admin-login endpoint (admins cannot use the
// generic /auth/login path); trainer & client use the generic login.
const QA_ACCOUNTS = [
  { label: "Admin",   email: "qa-admin@fitos.local",   dest: ROUTES.ADMIN_DASHBOARD,   admin: true },
  { label: "Trainer", email: "qa-trainer@fitos.local", dest: ROUTES.TRAINER_DASHBOARD },
  { label: "Client",  email: "qa-client@fitos.local",  dest: ROUTES.CLIENT_DASHBOARD },
];

const QASwitcher = () => {
  const { login, adminLogin, logout } = useAuthContext();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);

  const quickLogin = async (acct) => {
    setBusy(acct.label);
    setErr(null);
    try {
      const credentials = { email: acct.email, password: QA_PASSWORD };
      await (acct.admin ? adminLogin(credentials) : login(credentials));
      navigate(acct.dest);
    } catch (e) {
      setErr(e?.message || "Login failed");
    } finally {
      setBusy(null);
    }
  };

  const signOut = async () => {
    setBusy("out");
    try { await logout(); navigate(ROUTES.LOGIN); }
    finally { setBusy(null); }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-56 rounded-xl border border-amber-400/30 bg-black/90 backdrop-blur p-3 shadow-glow text-left">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">QA Quick Login</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {QA_ACCOUNTS.map((a) => (
          <button
            key={a.label}
            onClick={() => quickLogin(a)}
            disabled={Boolean(busy)}
            className="h-8 rounded-lg bg-surface-elevated border border-border text-[12px] text-text-primary hover:border-amber-400/40 disabled:opacity-50"
          >
            {busy === a.label ? "…" : a.label}
          </button>
        ))}
      </div>
      <button
        onClick={signOut}
        disabled={Boolean(busy)}
        className="mt-1.5 w-full h-7 rounded-lg text-[11px] text-text-muted hover:text-text-primary disabled:opacity-50"
      >
        {busy === "out" ? "Signing out…" : "Sign out"}
      </button>
      {err && <p className="mt-1.5 text-[11px] text-red-300">{err}</p>}
    </div>
  );
};

export default QASwitcher;
