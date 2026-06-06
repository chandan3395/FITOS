"use strict";

const ApiError = require("../utils/ApiError");
const logger = require("../config/logger");

const errorHandler = (err, _req, res, _next) => {
  logger.error(err.stack || err.message);

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
