// ─────────────────────────────────────────────────────────────
// Dev-only auth bypass.
//
// This module is the single source of truth for "are we bypassing
// auth right now?" The check is hard-gated on `import.meta.env.DEV`
// (true during `vite` dev only) AND on the `VITE_DEV_AUTH_BYPASS`
// flag. In a production build, `import.meta.env.DEV` resolves to
// the literal `false` at compile time and Vite tree-shakes every
// bypass branch out of the bundle.
//
// Production auth logic (AuthContext bootstrap, RequireAuth role
// guard, axios refresh interceptor, OAuth flow, etc.) is never
// modified — the bypass simply short-circuits *into* AuthContext
// at boot and *into* RequireAuth on render. Disable the flag and
// every code path returns to the real flow with zero changes.
// ─────────────────────────────────────────────────────────────

export const DEV_BYPASS =
  import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === "true";

const STORAGE_KEY = "fitos.devRole";
const EVENT_NAME  = "fitos:devRoleChange";
const DEFAULT_ROLE = "TRAINER";

const CLIENT_STORAGE_KEY = "fitos.devClientId";
const CLIENT_EVENT_NAME  = "fitos:devClientChange";

/** Mock identities — must satisfy the same shape `/api/auth/me` returns. */
export const MOCK_USERS = {
  ADMIN: {
    _id:   "dev-admin",
    id:    "dev-admin",          // some pages read .id
    name:  "Dev Admin",
    email: "dev-admin@fitos.local",
    role:  "ADMIN",
    isActive: true,
  },
  TRAINER: {
    _id:   "dev-trainer",
    id:    "dev-trainer",
    name:  "Dev Trainer",
    email: "dev-trainer@fitos.local",
    role:  "TRAINER",
    isActive: true,
  },
  CLIENT: {
    _id:   "dev-client",
    id:    "dev-client",
    name:  "Dev Client",
    email: "dev-client@fitos.local",
    role:  "CLIENT",
    isActive: true,
  },
};

export const DEV_ROLES = Object.keys(MOCK_USERS); // ["ADMIN","TRAINER","CLIENT"]

/** Read the currently-selected dev role from localStorage. */
export function getDevRole() {
  if (!DEV_BYPASS) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && DEV_ROLES.includes(raw)) return raw;
  } catch {
    // localStorage may be unavailable (e.g. private window) — fall through.
  }
  return DEFAULT_ROLE;
}

/** Persist a new dev role and fan it out to subscribers. */
export function setDevRole(role) {
  if (!DEV_BYPASS) return;
  if (!DEV_ROLES.includes(role)) return;
  try { localStorage.setItem(STORAGE_KEY, role); } catch { /* ignore */ }
  // Custom event so listeners in the same tab pick it up — `storage`
  // events only fire across tabs.
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: role }));
}

/**
 * Subscribe to dev role changes. Returns an unsubscribe function.
 * Listens both to the in-tab custom event and the cross-tab `storage`
 * event so the switcher works no matter where it is changed from.
 */
export function subscribeDevRole(fn) {
  if (!DEV_BYPASS) return () => {};
  const onCustom = (e) => fn(e.detail);
  const onStorage = (e) => {
    if (e.key === STORAGE_KEY && e.newValue) fn(e.newValue);
  };
  window.addEventListener(EVENT_NAME, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT_NAME, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

/** Convenience — current mock user, or null if bypass is off. */
export function getMockUser() {
  if (!DEV_BYPASS) return null;
  return MOCK_USERS[getDevRole()];
}

// ── Dev client impersonation ──────────────────────────────────
// When acting as CLIENT, the trainer may pick a specific Client doc to
// view the app through. The selected id is forwarded to the backend via
// the `x-dev-client-id` header, which the dev bypass resolves into that
// client's linked User (auto-creating one on first impersonation).

export function getDevClientId() {
  if (!DEV_BYPASS) return null;
  try {
    return localStorage.getItem(CLIENT_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function setDevClientId(id) {
  if (!DEV_BYPASS) return;
  try {
    if (id) localStorage.setItem(CLIENT_STORAGE_KEY, id);
    else    localStorage.removeItem(CLIENT_STORAGE_KEY);
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(CLIENT_EVENT_NAME, { detail: id || null }));
}

export function subscribeDevClientId(fn) {
  if (!DEV_BYPASS) return () => {};
  const onCustom  = (e) => fn(e.detail);
  const onStorage = (e) => {
    if (e.key === CLIENT_STORAGE_KEY) fn(e.newValue || null);
  };
  window.addEventListener(CLIENT_EVENT_NAME, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CLIENT_EVENT_NAME, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
