import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import AuthLayout from "../../components/layouts/AuthLayout";
import api, { API_BASE_URL } from "../../lib/api";

/**
 * Client activation page.
 *
 * The client signs in with Google to activate. The Google account is linked
 * to the trainer-created Client profile (the source of truth) — even if the
 * Google email differs from the invited email, in which case the backend
 * redirects to a confirmation screen (LinkAccountPage). We carry the invite
 * token through the OAuth flow via `?invite=`.
 */
const ERROR_MESSAGES = {
  not_a_client:   "That Google account belongs to a coach or admin, so it can't activate a client profile. Try a different account.",
  already_linked: "This profile is already linked to a different account. Please contact your coach.",
  account_in_use: "That Google account is already linked to another client profile.",
  expired:        "This invitation has expired. Ask your coach to send a new one.",
  invite_invalid: "This invitation link is invalid.",
  link_failed:    "We couldn't complete sign-in. Please try again.",
  google_failed:  "Google sign-in failed. Please try again.",
};

const ActivatePage = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();

  const [invite,  setInvite]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(() => {
    const code = searchParams.get("error");
    return code ? (ERROR_MESSAGES[code] || "Something went wrong. Please try again.") : null;
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/auth/invite/${token}`);
        setInvite(res.data?.data?.invite || null);
      } catch (e) {
        const status = e?.response?.status;
        if (status === 404)      setError("This invitation link is invalid.");
        else if (status === 410) setError("This invitation has expired. Ask your coach to send a new one.");
        else                     setError(e?.response?.data?.message || "Could not load invite.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Top-level navigation (not XHR) — the OAuth redirect must be a full page nav.
  const googleUrl = `${API_BASE_URL}/auth/google?role=CLIENT&invite=${encodeURIComponent(token)}`;

  if (loading) {
    return (
      <AuthLayout>
        <div className="text-center py-6">
          <div className="w-8 h-8 mx-auto mb-3 border-2 border-primary border-t-transparent rounded-full animate-spin-slow" />
          <p className="text-sm text-text-secondary">Loading your invitation…</p>
        </div>
      </AuthLayout>
    );
  }

  if (!invite && error && !searchParams.get("error")) {
    return (
      <AuthLayout>
        <div className="text-center py-6">
          <p className="text-base font-semibold text-text-primary mb-2">Invitation problem</p>
          <p className="text-sm text-text-secondary">{error}</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-text-primary mb-1">
          Welcome, {invite?.clientName || "friend"}
        </h2>
        <p className="text-sm text-text-secondary">
          Activate your account to access your training portal.
        </p>
      </div>

      {invite?.email && (
        <div className="mb-5 rounded-xl bg-surface-elevated border border-border px-4 py-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.1em] text-text-muted">Invited as</p>
          <p className="text-sm font-medium text-text-primary mt-0.5">{invite.email}</p>
        </div>
      )}

      {error && (
        <div className="mb-5 text-[12.5px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <a
        href={googleUrl}
        className="w-full h-11 flex items-center justify-center gap-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-100 active:scale-[0.98] transition-all"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </a>

      <p className="text-[11px] text-text-muted text-center mt-3">
        You can use any Google account — we&apos;ll securely link it to your FITOS profile.
        {invite?.expiresAt
          ? ` This link expires on ${new Date(invite.expiresAt).toLocaleDateString()}.`
          : " This link expires in 72 hours."}
      </p>
    </AuthLayout>
  );
};

export default ActivatePage;
