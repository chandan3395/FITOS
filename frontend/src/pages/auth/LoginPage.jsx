import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../../components/layouts/AuthLayout";
import Button from "../../components/ui/Button";
import { useAuthContext } from "../../contexts/AuthContext";
import { ROUTES } from "../../constants/routes";

const dashboardFor = (role) => {
  if (role === "ADMIN")   return ROUTES.ADMIN_DASHBOARD;
  if (role === "TRAINER") return ROUTES.TRAINER_DASHBOARD;
  if (role === "CLIENT")  return ROUTES.CLIENT_DASHBOARD;
  return ROUTES.HOME;
};

// Google OAuth lives on the backend; we let the browser navigate to it so
// the OAuth redirect dance happens on the same origin as the server.
function googleSignInUrl(role = "TRAINER") {
  // Vite dev proxy forwards /api/* to the backend.
  return `/api/auth/google?role=${encodeURIComponent(role)}`;
}

const LoginPage = () => {
  const { adminLogin, isAuthenticated, user, isReady } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [showAdmin, setShowAdmin]   = useState(false);
  const [email,     setEmail]       = useState("");
  const [password,  setPassword]    = useState("");
  const [loading,   setLoading]     = useState(false);
  const [error,     setError]       = useState(
    searchParams.get("error") === "google_failed" ? "Google sign-in failed. Please try again." : null
  );

  useEffect(() => {
    if (isReady && isAuthenticated && user) {
      navigate(location.state?.from || dashboardFor(user.role), { replace: true });
    }
  }, [isReady, isAuthenticated, user, navigate, location.state]);

  const onAdminSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const u = await adminLogin({ email, password });
      navigate(location.state?.from || dashboardFor(u?.role), { replace: true });
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-text-primary mb-1">Welcome to FITOS</h2>
        <p className="text-sm text-text-secondary">Sign in or create your trainer account.</p>
      </div>

      {/* Google primary CTA — used by trainers (sign up + sign in) and clients */}
      <a
        href={googleSignInUrl("TRAINER")}
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
        New trainers are auto-onboarded. Clients sign in through the activation link sent by their coach.
      </p>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <span className="flex-1 h-px bg-border" />
        <span className="text-[11px] uppercase tracking-wider text-text-muted">Admin</span>
        <span className="flex-1 h-px bg-border" />
      </div>

      {!showAdmin ? (
        <button
          type="button"
          onClick={() => setShowAdmin(true)}
          className="w-full text-[12.5px] font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          Sign in with email & password →
        </button>
      ) : (
        <form onSubmit={onAdminSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold tracking-[0.08em] text-text-muted uppercase mb-2">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@fitos.app"
              className="w-full h-10 px-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#333] transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-[0.08em] text-text-muted uppercase mb-2">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-10 px-3 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#333] transition-colors"
            />
          </div>
          {error && (
            <div className="text-[12.5px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <Button type="submit" loading={loading} className="w-full" size="md">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          <button
            type="button"
            onClick={() => setShowAdmin(false)}
            className="block w-full text-center text-[12px] text-text-muted hover:text-text-primary mt-2"
          >
            ← Back to Google sign-in
          </button>
        </form>
      )}

      {!showAdmin && error && (
        <div className="mt-4 text-[12.5px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </AuthLayout>
  );
};

export default LoginPage;
