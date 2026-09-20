import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../contexts/AuthContext";
import AuthLayout from "../../components/layouts/AuthLayout";
import { setAccessToken } from "../../lib/api";
import authService from "../../services/authService";
import { ROUTES } from "../../constants/routes";

const dashboardFor = (role) => {
  if (role === "BYOT") return "/byot";
  if (role === "ADMIN")   return ROUTES.ADMIN_DASHBOARD;
  if (role === "TRAINER") return ROUTES.TRAINER_DASHBOARD;
  if (role === "CLIENT")  return ROUTES.CLIENT_DASHBOARD;
  return ROUTES.HOME;
};

/**
 * Lands here after Google OAuth. The backend redirected us with the access
 * token in the URL fragment (#token=...&role=...). We pull it out, store it,
 * confirm the session by calling /me, and route by role.
 */
const GoogleCallbackPage = () => {
  const navigate = useNavigate();
  const { completeGoogleLogin } = useAuthContext();
  const started = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
        const params = new URLSearchParams(hash);
        const token = params.get("token");

        if (!token) throw new Error("Missing access token in callback URL");

        setAccessToken(token);
        // Strip the hash so the token doesn't linger in the address bar.
        window.history.replaceState({}, document.title, window.location.pathname);

        // Validate the token + hydrate user info via /me.
        const me = await authService.getCurrentUser();
        if (!me) throw new Error("Could not load profile");

        completeGoogleLogin(me);
        navigate(dashboardFor(me.role), { replace: true });
      } catch (err) {
        setError(err?.message || "Sign-in failed");
        setTimeout(() => navigate(ROUTES.LOGIN, { replace: true }), 1500);
      }
    })();
  }, [navigate, completeGoogleLogin]);

  return (
    <AuthLayout>
      <div className="text-center py-6">
        {error ? (
          <>
            <p className="text-sm text-danger mb-2">{error}</p>
            <p className="text-[12px] text-text-muted">Redirecting you back to sign-in…</p>
          </>
        ) : (
          <>
            <div className="w-8 h-8 mx-auto mb-3 border-2 border-primary border-t-transparent rounded-full animate-spin-slow" />
            <p className="text-sm text-text-secondary">Signing you in…</p>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

export default GoogleCallbackPage;
