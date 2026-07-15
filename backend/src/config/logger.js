"use strict";

const pino = require("pino");
const { env } = require("./env");

const IS_PROD = env.NODE_ENV === "production";
// pino-pretty runs in a worker thread, which Jest cannot tear down cleanly —
// use plain (JSON) output under test, same as production.
const IS_TEST = env.NODE_ENV === "test" || Boolean(process.env.JEST_WORKER_ID);

const options = { level: env.LOG_LEVEL || (IS_PROD ? "info" : "debug") };

// Dev gets pretty output via pino-pretty's synchronous in-process stream
// rather than the worker-thread transport: the worker races process.exit()
// on Windows (libuv UV_HANDLE_CLOSING assertion crash on shutdown).
// Production and test log plain JSON to stdout.
const pinoLogger = IS_PROD || IS_TEST
  ? pino(options)
  : pino(
      options,
      require("pino-pretty")({ colorize: true, translateTime: "SYS:HH:MM:ss", sync: true })
    );

// Existing call sites pass console-style args — e.g.
//   logger.info("[whatsapp] message sent", { to, messageId })
// while pino expects (mergeObject, message). Adapt: objects/Errors merge
// into the structured entry, everything else joins into the message string.
function adapt(level) {
  return (...args) => {
    let merge;
    const parts = [];
    for (const arg of args) {
      if (arg instanceof Error) merge = { ...merge, err: arg };
      else if (typeof arg === "object" && arg !== null) merge = { ...merge, ...arg };
      else if (arg !== undefined) parts.push(String(arg));
    }
    pinoLogger[level](merge || {}, parts.join(" "));
  };
}

const logger = {
  info: adapt("info"),
  warn: adapt("warn"),
  error: adapt("error"),
  debug: adapt("debug"),
  // Raw pino instance — lets pino-http (requestLogger) share the same
  // configuration and output stream.
  pino: pinoLogger,
};

module.exports = logger;
