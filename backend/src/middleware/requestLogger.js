"use strict";

const morgan = require("morgan");

const requestLogger = morgan(":method :url :status");

module.exports = requestLogger;
