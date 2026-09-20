"use strict";

const ApiError = require("../utils/ApiError");
const logger = require("../config/logger");

const errorHandler = (err, _req, res, _next) => {
  res.locals.releaseMediaCapacity?.();
  const personal = /^\/api\/byot\/(nutrition|workouts|progress)(?:\/|$)/.test(_req.path);
  if (personal) logger.error("BYOT personal request failed");
  else if (_req.path.startsWith("/api/auth/google")) logger.error("Google authentication request failed");
  else logger.error(err.stack || err.message);

  if (personal && ["entity.too.large", "entity.parse.failed"].includes(err.type)) {
    if (_req.path.startsWith("/api/byot/progress")) return res.status(err.type === "entity.too.large" ? 413 : 400).json({ success: false, message: err.type === "entity.too.large" ? "Request is too large (images: 8 MB; JSON: 100 KB)." : "Malformed progress request" });
    const moduleName = _req.path.startsWith("/api/byot/nutrition") ? "Nutrition" : "Workout";
    return res.status(err.type === "entity.too.large" ? 413 : 400).json({
      success: false,
      message: err.type === "entity.too.large" ? `${moduleName} request exceeds 100 KB. Use fewer or shorter entries.` : `Malformed ${moduleName.toLowerCase()} JSON`,
    });
  }

  if (err instanceof ApiError) {
    const body = {
      success: false,
      message: err.message,
    };
    if (err.errors) body.errors = err.errors;
    return res.status(err.statusCode).json(body);
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

module.exports = errorHandler;
