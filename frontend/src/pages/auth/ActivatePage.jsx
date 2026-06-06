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
 * Loads invite metadata on mount. On submit it requires both a password
 * and a matching confirmation (min 8 chars). On success we store the
 * access token and route into the client portal.
 */
const PASSWORD_MIN = 8;

const ActivatePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [invite,   setInvite]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [submitting, setSubmit] = useState(false);

  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [fieldErr,   setFieldErr]   = useState({}); // { password, confirm }

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

  function validate() {
    const errs = {};
    if (!password)                      errs.password = "Password is required.";
    else if (password.length < PASSWORD_MIN)
      errs.password = `Password must be at least ${PASSWORD_MIN} characters.`;
    if (!confirm)                       errs.confirm  = "Confirm your password.";
    else if (confirm !== password)      errs.confirm  = "Passwords do not match.";
    return errs;
  }

  const activate = async (e) => {
    e?.preventDefault();
    setError(null);

    const errs = validate();
    setFieldErr(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmit(true);
    try {
      const res = await api.post(`/auth/invite/${token}/activate`, { password });
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

  const inputCls = (bad) =>
    `w-full h-10 px-3 rounded-lg bg-surface-elevated border ${bad ? "border-red-500/50 focus:border-red-400" : "border-border focus:border-[#333]"} text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-colors`;

  return (
    <AuthLayout>
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-text-primary mb-1">
          Welcome, {invite?.clientName || "friend"}
        </h2>
        <p className="text-sm text-text-secondary">Create a password to activate your account.</p>
      </div>

      <form onSubmit={activate} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-[11px] font-semibold tracking-[0.08em] text-text-muted uppercase mb-2">
            Password <span className="text-red-400">*</span>
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErr.password) setFieldErr((p) => ({ ...p, password: undefined }));
            }}
            placeholder={`At least ${PASSWORD_MIN} characters`}
            className={inputCls(fieldErr.password)}
            autoComplete="new-password"
          />
          {fieldErr.password && <p className="mt-1.5 text-[11.5px] text-red-300">{fieldErr.password}</p>}
        </div>

        <div>
          <label htmlFor="confirm" className="block text-[11px] font-semibold tracking-[0.08em] text-text-muted uppercase mb-2">
            Confirm password <span className="text-red-400">*</span>
          </label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (fieldErr.confirm) setFieldErr((p) => ({ ...p, confirm: undefined }));
            }}
            placeholder="Re-enter the password"
            className={inputCls(fieldErr.confirm)}
            autoComplete="new-password"
          />
          {fieldErr.confirm && <p className="mt-1.5 text-[11.5px] text-red-300">{fieldErr.confirm}</p>}
        </div>

        <p className="text-[11px] text-text-muted">
          You&apos;ll use this password to sign back in next time. The activation link expires
          {invite?.expiresAt ? ` on ${new Date(invite.expiresAt).toLocaleDateString()}` : " in 72 hours"}.
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
