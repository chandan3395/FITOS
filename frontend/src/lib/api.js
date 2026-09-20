import axios from "axios";

// ─────────────────────────────────────────────────────────────
// Token store — in-memory + localStorage for restore on reload.
// The refresh token is stored ONLY in an HttpOnly cookie set by
// the backend; it is never read or written from JS.
// ─────────────────────────────────────────────────────────────
const ACCESS_KEY = "fitos.accessToken";

let accessToken = (() => {
  try { return localStorage.getItem(ACCESS_KEY) || null; }
  catch { return null; }
})();

export const getAccessToken = () => accessToken;
let sessionEpoch = 0;
const subject = (token) => {
  try { return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).userId; }
  catch { return null; }
};

export const setAccessToken = (token) => {
  if (!token || subject(token) !== subject(accessToken)) sessionEpoch++;
  accessToken = token || null;
  try {
    if (token) localStorage.setItem(ACCESS_KEY, token);
    else       localStorage.removeItem(ACCESS_KEY);
  } catch {
    /* storage may be unavailable in private mode — ignore */
  }
};

// ─────────────────────────────────────────────────────────────
// Axios instance. Web production uses the frontend's /api reverse proxy so
// the HttpOnly refresh cookie remains first-party. Direct cross-origin API
// traffic is an explicit escape hatch for local fixtures and deployments
// that have deliberately provided an equivalent cookie-compatible setup.
// ─────────────────────────────────────────────────────────────
const configuredApiBase = import.meta.env.VITE_API_URL || "/api";
export const API_BASE_URL =
  import.meta.env.PROD && import.meta.env.VITE_DIRECT_CROSS_ORIGIN_API !== "true"
    ? "/api"
    : configuredApiBase;

const REFRESH_TIMEOUT_MS = 60000;

export const isSessionRejection = (error) => error?.response?.status === 401;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { "X-FITOS-CSRF": "1" },
  timeout: 15000,
});

// Attach the bearer access token on every request.
api.interceptors.request.use((config) => {
  config._sessionEpoch ??= sessionEpoch;
  config.headers = config.headers || {};
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ─────────────────────────────────────────────────────────────
// 401 handler — try refresh once, then retry the original request.
// Concurrent 401s share a single refresh promise to avoid races.
// ─────────────────────────────────────────────────────────────
let refreshPromise = null;
let onUnauthorized = null;

/** Called by AuthContext to clear local state when refresh fails. */
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

export async function refreshAccessToken() {
  const epoch = sessionEpoch;
  // Raw axios: no interceptors and no Authorization header. It uses the same
  // base URL as the shared instance, including the production /api proxy.
  const res = await axios.post(
    `${API_BASE_URL}/auth/refresh`,
    {},
    {
      withCredentials: true,
      timeout: REFRESH_TIMEOUT_MS,
      headers: { "X-FITOS-CSRF": "1" },
    }
  );
  const next = res?.data?.data?.accessToken;
  if (!next) throw new Error("Refresh returned no token");
  if (epoch !== sessionEpoch) throw new axios.CanceledError("Session changed");
  setAccessToken(next);
  return next;
}

api.interceptors.response.use(
  (res) => {
    if (res.config._sessionEpoch !== sessionEpoch) throw new axios.CanceledError("Session changed");
    return res;
  },
  async (error) => {
    const original = error?.config;
    const status   = error?.response?.status;
    if (original && original._sessionEpoch !== sessionEpoch) return Promise.reject(new axios.CanceledError("Session changed"));
    if (status === 401 && original?._retried) {
      setAccessToken(null);
      if (onUnauthorized) onUnauthorized();
      return Promise.reject(error);
    }

    // Bail on anything that isn't a 401, or if we already retried,
    // or if this *is* the refresh call (avoid loops).
    if (
      status !== 401 ||
      !original ||
      original._retried ||
      original.url?.includes("/auth/refresh") || original.url?.includes("/auth/logout")
    ) {
      return Promise.reject(error);
    }

    original._retried = true;

    try {
      refreshPromise = refreshPromise ?? refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      await refreshPromise;
      // Replay original request with new token
      return api(original);
    } catch (refreshErr) {
      if (original._sessionEpoch !== sessionEpoch) return Promise.reject(refreshErr);
      // A missing/expired/revoked refresh credential is terminal. Network
      // errors, cold starts, 429s and 5xx responses are recoverable and must
      // not erase a still-valid browser session.
      if (isSessionRejection(refreshErr)) {
        setAccessToken(null);
        if (onUnauthorized) onUnauthorized();
      }
      return Promise.reject(refreshErr);
    }
  }
);

window.addEventListener("storage", (event) => {
  if (event.key !== ACCESS_KEY || event.newValue === accessToken) return;
  if (subject(event.newValue) === subject(accessToken) && event.newValue) {
    accessToken = event.newValue;
    return;
  }
  sessionEpoch++;
  accessToken = null;
  if (onUnauthorized) onUnauthorized();
});

export default api;
