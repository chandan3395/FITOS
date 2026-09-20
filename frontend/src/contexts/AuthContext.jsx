import { Fragment, createContext, useCallback, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import authService from "../services/authService";
import api, {
  getAccessToken,
  isSessionRejection,
  setAccessToken,
  setUnauthorizedHandler,
} from "../lib/api";
import { ROUTES } from "../constants/routes";

export const AuthContext = createContext(null);

const STATUS = {
  IDLE:    "idle",      // initial pre-bootstrap state
  LOADING: "loading",   // bootstrapping session
  AUTHED:  "authed",
  GUEST:   "guest",
  RECOVERABLE: "recoverable",
};

export const AuthProvider = ({ children }) => {
  const [user,   setUser]   = useState(null);
  const [status, setStatus] = useState(STATUS.IDLE);
  const [error,  setError]  = useState(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);

  // ── Bootstrap ───────────────────────────────────────────────
  // On load: if there's no access token in memory, attempt a silent
  // refresh (the refresh cookie may still be valid), then hydrate /me.
  useEffect(() => {
    if (window.location.pathname === "/auth/google/callback") { setStatus(STATUS.GUEST); return; }
    let cancelled = false;
    setStatus(STATUS.LOADING);
    setError(null);

    (async () => {
      try {
        if (!getAccessToken()) {
          // No access token in memory — try a silent refresh.
          // Going via the shared `api` instance is safe here because the
          // refresh interceptor explicitly skips /auth/refresh.
          try {
            const r = await api.post("/auth/refresh", {});
            const next = r?.data?.data?.accessToken;
            if (next) setAccessToken(next);
          } catch (err) {
            if (!cancelled) {
              setUser(null);
              if (isSessionRejection(err)) {
                setStatus(STATUS.GUEST);
              } else {
                setError("FITOS could not restore your session. Check your connection and try again.");
                setStatus(STATUS.RECOVERABLE);
              }
            }
            return;
          }
        }

        const me = await authService.getCurrentUser();
        if (cancelled) return;
        if (me) {
          setUser(me);
          setStatus(STATUS.AUTHED);
        } else {
          setUser(null);
          setStatus(STATUS.GUEST);
        }
      } catch (err) {
        if (cancelled) return;
        if (isSessionRejection(err)) {
          setUser(null);
          setStatus(STATUS.GUEST);
        } else {
          setError("FITOS could not restore your session. Check your connection and try again.");
          setStatus(STATUS.RECOVERABLE);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [bootstrapAttempt]);

  // No messaging connection for BYOT. Check revocation on resume and once per minute.
  useEffect(() => {
    if (user?.role !== "BYOT") return;
    let pending = false;
    const check = async () => {
      if (pending || document.hidden) return;
      pending = true;
      try { await authService.getCurrentUser(); } catch { /* interceptor handles revoked sessions */ }
      finally { pending = false; }
    };
    const timer = setInterval(check, 60000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => { clearInterval(timer); window.removeEventListener("focus", check); document.removeEventListener("visibilitychange", check); };
  }, [user?._id, user?.role]);

  // When the API interceptor gives up on refresh, drop session locally.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setError("Your session ended or account access changed. Please sign in again.");
      setUser(null);
      setStatus(STATUS.GUEST);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const adminLogin = useCallback(async ({ email, password }) => {
    setError(null);
    setStatus(STATUS.LOADING);
    try {
      const u = await authService.adminLogin({ email, password });
      setUser(u);
      setStatus(STATUS.AUTHED);
      return u;
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Login failed";
      setError(msg);
      setStatus(STATUS.GUEST);
      throw new Error(msg);
    }
  }, []);

  // Generic email + password login (ADMIN/TRAINER/CLIENT) — used by the demo
  // access buttons and any non-admin password sign-in. Mirrors adminLogin.
  const login = useCallback(async ({ email, password }) => {
    setError(null);
    setStatus(STATUS.LOADING);
    try {
      const u = await authService.login({ email, password });
      setUser(u);
      setStatus(STATUS.AUTHED);
      return u;
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Login failed";
      setError(msg);
      setStatus(STATUS.GUEST);
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setStatus(STATUS.GUEST);
    setError(null);
    await authService.logout();
  }, []);

  const completeGoogleLogin = useCallback((me) => { setError(null); setUser(me); setStatus(STATUS.AUTHED); }, []);
  const retrySession = useCallback(() => setBootstrapAttempt((value) => value + 1), []);

  const value = {
    user,
    status,
    error,
    isReady:         status !== STATUS.IDLE && status !== STATUS.LOADING,
    isAuthenticated: status === STATUS.AUTHED,
    completeGoogleLogin,
    adminLogin,
    login,
    logout,
    retrySession,
    sessionRecoverable: status === STATUS.RECOVERABLE,
  };

  return <AuthContext.Provider value={value}><Fragment key={user?._id || "guest"}>{children}</Fragment></AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
};

// ─────────────────────────────────────────────────────────────
// Route guards — keep them colocated so they share AuthContext.
// ─────────────────────────────────────────────────────────────
export const RequireAuth = ({ roles, children }) => {
  const { error, isAuthenticated, isReady, retrySession, sessionRecoverable, user } = useAuthContext();
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin-slow" />
      </div>
    );
  }

  if (sessionRecoverable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg px-5">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center shadow-card">
          <h1 className="text-xl font-semibold text-text-primary">Session temporarily unavailable</h1>
          <p className="mt-2 text-sm text-text-secondary">{error}</p>
          <button
            type="button"
            onClick={retrySession}
            className="mt-5 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user?.role)) {
    // Send the user to their own portal instead of the requested one.
    const fallback =
      user?.role === "BYOT" ? "/byot" :
      user?.role === "ADMIN"   ? ROUTES.ADMIN_DASHBOARD   :
      user?.role === "TRAINER" ? ROUTES.TRAINER_DASHBOARD :
      user?.role === "CLIENT"  ? ROUTES.CLIENT_DASHBOARD  : ROUTES.HOME;
    return <Navigate to={fallback} replace />;
  }

  return children;
};
