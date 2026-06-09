import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AuthLayout from "../../components/layouts/AuthLayout";
import Button from "../../components/ui/Button";
import api, { setAccessToken } from "../../lib/api";
import authService from "../../services/authService";
import { ROUTES } from "../../constants/routes";

/**
 * Client activation page.
 *
 * Loads invite metadata on mount. Activation no longer sets a password —
 * clients confirm with one tap, which provisions their account and signs
 * them in. On future visits they sign in with Google using the same email.
 */
const ActivatePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [invite,     setInvite]   = useState(null);
  const [loading,    setLoading]  = useState(true);
  const [error,      setError]    = useState(null);
  const [submitting, setSubmit]   = useState(false);

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

  const activate = async (e) => {
    e?.preventDefault();
    setError(null);
    setSubmit(true);
    try {
      const res = await api.post(`/auth/invite/${token}/activate`, {});
      const accessToken = res.data?.data?.accessToken;
      if (!accessToken) throw new Error("Activation response missing accessToken");
      setAccessToken(accessToken);
      await authService.getCurrentUser();
      navigate(ROUTES.CLIENT_DASHBOARD, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Activation failed");
    } finally {
      setSubmit(false);
    }
  };

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

  if (error && !invite) {
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

      <form onSubmit={activate} className="space-y-4">
        <p className="text-[11px] text-text-muted text-center">
          Next time, sign in with Google using the same email.
          {invite?.expiresAt
            ? ` This link expires on ${new Date(invite.expiresAt).toLocaleDateString()}.`
            : " This link expires in 72 hours."}
        </p>

        {error && (
          <div className="text-[12.5px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <Button type="submit" loading={submitting} className="w-full" size="md">
          {submitting ? "Activating…" : "Activate my account"}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default ActivatePage;
