import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../../components/layouts/AuthLayout";
import { setAccessToken } from "../../lib/api";
import authService from "../../services/authService";
import { ROUTES } from "../../constants/routes";

const dashboardFor = (role) => {
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
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
        const params = new URLSearchParams(hash);
        const token = params.get("token");
        const role  = params.get("role");
        if (!token) throw new Error("Missing access token in callback URL");

        setAccessToken(token);
        // Strip the hash so the token doesn't linger in the address bar.
        window.history.replaceState({}, document.title, window.location.pathname);

        // Validate the token + hydrate user info via /me.
        const me = await authService.getCurrentUser();
        if (!me) throw new Error("Could not load profile");

        navigate(dashboardFor(role || me.role), { replace: true });
      } catch (err) {
        setError(err?.message || "Sign-in failed");
        setTimeout(() => navigate(ROUTES.LOGIN, { replace: true }), 1500);
      }
    })();
  }, [navigate]);

  return (
    <AuthLayout>
      <div className="text-center py-6">
        {error ? (
          <>
            <p className="text-sm text-red-300 mb-2">{error}</p>
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
