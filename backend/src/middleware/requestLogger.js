"use strict";

const { randomUUID } = require("crypto");
const { pinoHttp } = require("pino-http");
const logger = require("../config/logger");

// Structured per-request logging. Every request gets an id (honouring an
// incoming X-Request-Id from the proxy, else a fresh UUID) that is echoed
// back on the response and attached to the log entry as req.id.
const requestLogger = pinoHttp({
  logger: logger.pino,
  genReqId: (req, res) => {
    const id = req.headers["x-request-id"] || randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.originalUrl || req.url} ${res.statusCode}`,
  customErrorMessage: (req, res) => `${req.method} ${req.originalUrl || req.url} ${res.statusCode}`,
});

module.exports = requestLogger;
