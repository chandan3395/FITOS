import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AuthLayout from "../../components/layouts/AuthLayout";
import Button from "../../components/ui/Button";
import api, { setAccessToken } from "../../lib/api";
import authService from "../../services/authService";
import { ROUTES } from "../../constants/routes";

/**
 * Client activation page. Loads invite metadata on mount; on submit it
 * POSTs to /api/auth/invite/:token/activate which returns a token pair
 * (refresh cookie + access token in body). After activation we route
 * straight into the client portal.
 */
const ActivatePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [invite,   setInvite]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [submitting, setSubmit] = useState(false);
  const [password, setPassword] = useState("");

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
    setSubmit(true);
    setError(null);
    try {
      const res = await api.post(`/auth/invite/${token}/activate`, {
        password: password || undefined,
      });
      const accessToken = res.data?.data?.accessToken;
      if (!accessToken) throw new Error("Activation response missing accessToken");
      setAccessToken(accessToken);

      // Hydrate user via /me so the AuthContext layer picks them up too
      // on subsequent route renders.
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
        <p className="text-sm text-text-secondary">Activate your FITOS client account.</p>
      </div>

      <form onSubmit={activate} className="space-y-4">
        <div>
          <label className="block text-[11px] font-semibold tracking-[0.08em] text-text-muted uppercase mb-2">
            Set a password (optional)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to use this link only"
            className="w-full h-10 px-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#333] transition-colors"
          />
          <p className="text-[11px] text-text-muted mt-2">
            You can also sign back in by re-opening this link until it expires{invite?.expiresAt && ` on ${new Date(invite.expiresAt).toLocaleDateString()}`}.
          </p>
        </div>

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
