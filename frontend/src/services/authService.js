import api, { setAccessToken } from "../lib/api";

/**
 * POST /api/auth/admin/login
 * Returns { user } and stores the access token in memory + localStorage.
 * Refresh token is set as an HttpOnly cookie by the backend.
 */
async function adminLogin({ email, password }) {
  const res = await api.post("/auth/admin/login", { email, password });
  const { accessToken, user } = res.data?.data ?? {};
  if (!accessToken) throw new Error("Login response missing accessToken");
  setAccessToken(accessToken);
  return user;
}

/** POST /api/auth/trainer/login — email/password login for trainers */
async function trainerLogin({ email, password }) {
  const res = await api.post("/auth/trainer/login", { email, password });
  const { accessToken, user } = res.data?.data ?? {};
  if (!accessToken) throw new Error("Login response missing accessToken");
  setAccessToken(accessToken);
  return user;
}

/** POST /api/auth/trainer/signup — open trainer self-signup */
async function trainerSignup({ name, email, password }) {
  const res = await api.post("/auth/trainer/signup", { name, email, password });
  const { accessToken, user } = res.data?.data ?? {};
  if (!accessToken) throw new Error("Signup response missing accessToken");
  setAccessToken(accessToken);
  return user;
}

/** GET /api/auth/me — authenticated profile fetch */
async function getCurrentUser() {
  const res = await api.get("/auth/me");
  return res.data?.user ?? null;
}

/**
 * POST /api/auth/logout
 * Backend clears the refresh cookie. We clear the access token locally.
 * Always resolves — logout should never block on a server error.
 */
async function logout() {
  try { await api.post("/auth/logout"); } catch { /* ignore */ }
  setAccessToken(null);
}

const authService = { adminLogin, trainerLogin, trainerSignup, getCurrentUser, logout };

export default authService;
