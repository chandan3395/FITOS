"use strict";
const { env } = require("../config/env");
const ApiError = require("../utils/ApiError");
// Native clients have no Origin. They must send a custom header, which browser
// forms cannot set and cross-origin scripts cannot send without CORS permission.
module.exports = function cookieOrigin(req, _res, next) {
  const origin = req.get("Origin");
  if (
    (origin && origin !== new URL(env.CLIENT_ORIGIN).origin) ||
    (!origin && req.get("X-FITOS-CSRF") !== "1")
  )
    return next(new ApiError(403, "Untrusted request origin"));
  next();
};
