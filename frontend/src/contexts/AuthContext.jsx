import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import authService from "../services/authService";
import api, {
  getAccessToken,
  setAccessToken,
  setUnauthorizedHandler,
} from "../lib/api";
import { ROUTES } from "../constants/routes";
import {
  DEV_BYPASS,
  MOCK_USERS,
  getDevRole,
  setDevRole as setDevRoleStore,
  subscribeDevRole,
} from "../lib/devAuth";

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
  // `devRole` is only meaningful when DEV_BYPASS is true; in production it
  // stays null and Vite strips the surrounding branches at build time.
  const [devRole, setDevRoleState] = useState(DEV_BYPASS ? getDevRole() : null);

  // ── Bootstrap ───────────────────────────────────────────────
  // Dev bypass takes the hard short-circuit before any HTTP. In
  // production this branch is dead code (DEV_BYPASS is a compile-time
  // false) and the original /refresh + /me flow runs unchanged.
  useEffect(() => {
    let cancelled = false;
    setStatus(STATUS.LOADING);

    if (DEV_BYPASS) {
      const role = getDevRole();
      setUser(MOCK_USERS[role]);
      setDevRoleState(role);
      setStatus(STATUS.AUTHED);
      return () => {};
    }

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

  // ── Dev role change subscription ────────────────────────────
  // Whenever the dev role switcher changes the persisted role, swap
  // the active mock user. No-op in production.
  useEffect(() => {
    if (!DEV_BYPASS) return undefined;
    return subscribeDevRole((nextRole) => {
      setDevRoleState(nextRole);
      setUser(MOCK_USERS[nextRole]);
      setStatus(STATUS.AUTHED);
    });
  }, []);

  // When the API interceptor gives up on refresh, drop session locally.
  // (Real auth path only. The bypass never makes authenticated requests
  // through the interceptor because there's no real token.)
  useEffect(() => {
    if (DEV_BYPASS) return undefined;
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
    // In dev bypass we still want a "signed out" view if the trainer
    // clicks the sidebar logout button, so we drop to GUEST. The
    // switcher remains visible and they can pick a role to re-enter.
    if (DEV_BYPASS) {
      setUser(null);
      setStatus(STATUS.GUEST);
      return;
    }
    await authService.logout();
    setUser(null);
    setStatus(STATUS.GUEST);
  }, []);

  // Dev-only action — flips the current mock role. No-op in production.
  const setDevRole = useCallback((role) => {
    if (!DEV_BYPASS) return;
    setDevRoleStore(role); // persistence + event fan-out
  }, []);

  const value = {
    user,
    status,
    error,
    isReady:        status !== STATUS.IDLE && status !== STATUS.LOADING,
    isAuthenticated: status === STATUS.AUTHED,
    adminLogin,
    trainerLogin,
    trainerSignup,
    logout,
    // Dev-only — null in production (DEV_BYPASS is false at compile time).
    devBypass: DEV_BYPASS,
    devRole,
    setDevRole,
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
