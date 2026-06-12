import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../../components/layouts/AuthLayout";
import Button from "../../components/ui/Button";
import api, { setAccessToken } from "../../lib/api";
import authService from "../../services/authService";
import { ROUTES } from "../../constants/routes";

/**
 * Account-link confirmation screen.
 *
 * Reached only when the invited email and the Google email differ. The backend
 * redirected here with a signed `linkToken` (plus display-only emails) in the
 * URL fragment. Confirming POSTs the token to /auth/invite/link/confirm, which
 * attaches the Google account to the existing client profile. No raw ids are
 * ever trusted from the client — the signed token authorizes the link.
 */
const LinkAccountPage = () => {
  const navigate = useNavigate();

  const [params, setParams]   = useState(null);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const sp = new URLSearchParams(hash);
    const linkToken = sp.get("linkToken");
    setParams({
      linkToken,
      invitedEmail: sp.get("invitedEmail") || "",
      googleEmail:  sp.get("googleEmail") || "",
      clientName:   sp.get("clientName") || "your profile",
    });
    // Strip the fragment so the token doesn't linger in the address bar.
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  const confirm = async () => {
    if (!params?.linkToken) return;
    setError(null);
    setBusy(true);
    try {
      const res = await api.post("/auth/invite/link/confirm", { linkToken: params.linkToken });
      const accessToken = res.data?.data?.accessToken;
      if (!accessToken) throw new Error("Link response missing accessToken");
      setAccessToken(accessToken);
      await authService.getCurrentUser();
      navigate(ROUTES.CLIENT_DASHBOARD, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not link your account.");
      setBusy(false);
    }
  };

  const cancel = () => navigate(ROUTES.LOGIN, { replace: true });

  if (params && !params.linkToken) {
    return (
      <AuthLayout>
        <div className="text-center py-6">
          <p className="text-base font-semibold text-text-primary mb-2">Link session expired</p>
          <p className="text-sm text-text-secondary mb-4">Please open your invitation link again to continue.</p>
          <Button variant="secondary" size="sm" onClick={cancel}>Back to sign in</Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-primary/12 text-primary flex items-center justify-center ring-1 ring-primary/20">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M9 12a3 3 0 013-3h3a3 3 0 010 6h-1.5M15 12a3 3 0 01-3 3H9a3 3 0 010-6h1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-1">Link your Google account?</h2>
        <p className="text-sm text-text-secondary">
          The email you signed in with is different from the one you were invited with.
          Linking keeps all of {params?.clientName ? <span className="text-text-primary font-medium">{params.clientName}</span> : "your"}&apos;s data in one place.
        </p>
      </div>

      <div className="space-y-3 mb-6">
        <div className="rounded-xl bg-surface-elevated border border-border px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.1em] text-text-muted">You were invited using</p>
          <p className="text-sm font-medium text-text-primary mt-0.5 break-all">{params?.invitedEmail || "—"}</p>
        </div>
        <div className="rounded-xl bg-primary/8 border border-primary/25 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.1em] text-primary/90">You are signing in with</p>
          <p className="text-sm font-semibold text-text-primary mt-0.5 break-all">{params?.googleEmail || "—"}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-[12.5px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button variant="secondary" className="flex-1" onClick={cancel} disabled={busy}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={confirm} loading={busy}>
          {busy ? "Linking…" : "Link Account"}
        </Button>
      </div>

      <p className="text-[11px] text-text-muted text-center mt-4">
        Your coach is notified whenever a different email is linked, for your security.
      </p>
    </AuthLayout>
  );
};

export default LinkAccountPage;
