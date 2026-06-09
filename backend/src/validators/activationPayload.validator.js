"use strict";

const NAME_MIN = 2;
const NAME_MAX = 200;

/**
 * Validates the body of POST /api/auth/invite/:token/activate.
 *
 * Activation no longer sets a password — clients authenticate via Google
 * using the same email. The only accepted field is an optional display-name
 * override; an empty/absent body is valid.
 *
 * Returns `{ ok, errors, value }` mirroring the client validator.
 */
function validateActivationPayload(body) {
  const errors = {};
  const value  = {};

  // An empty body is fine — there are no required activation fields.
  if (body == null) return { ok: true, value };
  if (typeof body !== "object") {
    return { ok: false, errors: { _root: "Request body must be an object." } };
  }

  if (body.name != null && body.name !== "") {
    const name = String(body.name).trim();
    if (name.length < NAME_MIN)      errors.name = `Name must be at least ${NAME_MIN} characters.`;
    else if (name.length > NAME_MAX) errors.name = "Name is too long.";
    else                             value.name = name;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}

module.exports = { validateActivationPayload, NAME_MIN, NAME_MAX };
