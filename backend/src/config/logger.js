"use strict";

const { env } = require("./env");

const logger = {
  info: (...args) => console.log("[INFO]", ...args),
  warn: (...args) => console.warn("[WARN]", ...args),
  error: (...args) => console.error("[ERROR]", ...args),
  debug: (...args) => {
    if (env.NODE_ENV !== "production") console.log("[DEBUG]", ...args);
  },
};

module.exports = logger;
