"use strict";

const { randomUUID } = require("crypto");
const { pinoHttp } = require("pino-http");
const logger = require("../config/logger");
const safePath = value => {
  const path = (value || "").split("?")[0];
  if (/^\/api\/auth\/invite\//i.test(path)) return "/api/auth/invite/[private]";
  return /^\/api\/byot\/progress(?:\/|$)/i.test(path) ? "/api/byot/progress/[private]" : path;
};

// Structured per-request logging. Every request gets a server-generated id
// (never an arbitrary caller-provided value) that is echoed
// back on the response and attached to the log entry as req.id.
const requestLogger = pinoHttp({
  logger: logger.pino,
  serializers: {
    req: req => ({ id: req.id, method: req.method, url: safePath(req.url) }),
    res: res => ({ statusCode: res.statusCode }),
    err: err => ({ type: err.type, message: "Request failed" }),
  },
  genReqId: (req, res) => {
    const id = randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res) => `${req.method} ${safePath(req.originalUrl || req.url)} ${res.statusCode}`,
  customErrorMessage: (req, res) => `${req.method} ${safePath(req.originalUrl || req.url)} ${res.statusCode}`,
});

module.exports = requestLogger;
