import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import authService from "../services/authService";
import api, {
  getAccessToken,
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
};

export const AuthProvider = ({ children }) => {
  const [user,   setUser]   = useState(null);
  const [status, setStatus] = useState(STATUS.IDLE);
  const [error,  setError]  = useState(null);

  // ── Bootstrap ───────────────────────────────────────────────
  // On load: if there's no access token in memory, attempt a silent
  // refresh (the refresh cookie may still be valid), then hydrate /me.
  useEffect(() => {
    let cancelled = false;
    setStatus(STATUS.LOADING);

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
          } catch {
            if (!cancelled) {
              setUser(null);
              setStatus(STATUS.GUEST);
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
      } catch {
        if (cancelled) return;
        setUser(null);
        setStatus(STATUS.GUEST);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // When the API interceptor gives up on refresh, drop session locally.
  useEffect(() => {
    setUnauthorizedHandler(() => {
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

  const trainerLogin = useCallback(async ({ email, password }) => {
    setError(null);
    setStatus(STATUS.LOADING);
    try {
      const u = await authService.trainerLogin({ email, password });
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

  const trainerSignup = useCallback(async ({ name, email, password }) => {
    setError(null);
    setStatus(STATUS.LOADING);
    try {
      const u = await authService.trainerSignup({ name, email, password });
      setUser(u);
      setStatus(STATUS.AUTHED);
      return u;
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Signup failed";
      setError(msg);
      setStatus(STATUS.GUEST);
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setStatus(STATUS.GUEST);
  }, []);

  const value = {
    user,
    status,
    error,
    isReady:         status !== STATUS.IDLE && status !== STATUS.LOADING,
    isAuthenticated: status === STATUS.AUTHED,
    adminLogin,
    trainerLogin,
    trainerSignup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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
  const { isAuthenticated, isReady, user } = useAuthContext();
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin-slow" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user?.role)) {
    // Send the user to their own portal instead of the requested one.
    const fallback =
      user?.role === "ADMIN"   ? ROUTES.ADMIN_DASHBOARD   :
      user?.role === "TRAINER" ? ROUTES.TRAINER_DASHBOARD :
      user?.role === "CLIENT"  ? ROUTES.CLIENT_DASHBOARD  : ROUTES.HOME;
    return <Navigate to={fallback} replace />;
  }

  return children;
};
