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

export const setAccessToken = (token) => {
  accessToken = token || null;
  try {
    if (token) localStorage.setItem(ACCESS_KEY, token);
    else       localStorage.removeItem(ACCESS_KEY);
  } catch {
    /* storage may be unavailable in private mode — ignore */
  }
};

// ─────────────────────────────────────────────────────────────
// Axios instance. Locally (VITE_API_URL unset) the relative "/api"
// base works via the Vite dev proxy. In production (e.g. Vercel) the
// frontend and backend are on different origins, so VITE_API_URL must
// point at the full backend base URL. `withCredentials` is required to
// send the refresh cookie cross-origin.
// ─────────────────────────────────────────────────────────────
export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

// Attach the bearer access token on every request.
api.interceptors.request.use((config) => {
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

async function refreshAccessToken() {
  // raw axios — no interceptors, no Authorization header. Uses the same
  // base URL as the shared instance so it hits the backend in production
  // (not the Vercel origin) rather than a hardcoded "/api" prefix.
  const res = await axios.post(
    `${API_BASE_URL}/auth/refresh`,
    {},
    { withCredentials: true, timeout: 15000 }
  );
  const next = res?.data?.data?.accessToken;
  if (!next) throw new Error("Refresh returned no token");
  setAccessToken(next);
  return next;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config;
    const status   = error?.response?.status;

    // Bail on anything that isn't a 401, or if we already retried,
    // or if this *is* the refresh call (avoid loops).
    if (
      status !== 401 ||
      !original ||
      original._retried ||
      original.url?.includes("/auth/refresh")
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
      setAccessToken(null);
      if (onUnauthorized) onUnauthorized();
      return Promise.reject(refreshErr);
    }
  }
);

export default api;
