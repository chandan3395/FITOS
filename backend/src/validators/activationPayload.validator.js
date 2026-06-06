"use strict";

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 256;

/**
 * Validates the body of POST /api/auth/invite/:token/activate.
 *
 * Returns `{ ok, errors, value }` mirroring the client validator.
 *
 * Rules:
 *   - password required, length in [PASSWORD_MIN, PASSWORD_MAX]
 *   - name optional but length-checked when present
 */
function validateActivationPayload(body) {
  const errors = {};
  const value  = {};

  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _root: "Request body must be an object." } };
  }

  if (body.name != null && body.name !== "") {
    const name = String(body.name).trim();
    if (name.length < 2)        errors.name = "Name must be at least 2 characters.";
    else if (name.length > 200) errors.name = "Name is too long.";
    else                        value.name = name;
  }

  if (body.password == null || body.password === "") {
    errors.password = "Password is required.";
  } else if (typeof body.password !== "string") {
    errors.password = "Password must be a string.";
  } else if (body.password.length < PASSWORD_MIN) {
    errors.password = `Password must be at least ${PASSWORD_MIN} characters.`;
  } else if (body.password.length > PASSWORD_MAX) {
    errors.password = "Password is too long.";
  } else {
    value.password = body.password;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}

module.exports = { validateActivationPayload, PASSWORD_MIN, PASSWORD_MAX };
