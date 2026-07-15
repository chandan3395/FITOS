"use strict";

const { env } = require("./config/env");

// Sentry error monitoring — active only when SENTRY_DSN is set (production).
// Initialised before anything else loads so its instrumentation can hook
// the modules the app requires; without a DSN this block never runs and the
// SDK is never even required, so dev/test are completely unaffected.
let Sentry = null;
if (env.SENTRY_DSN) {
  Sentry = require("@sentry/node");
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
  });
}

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");

const corsOptions = require("./config/cors");
const { globalLimiter } = require("./middleware/rateLimit");
const requestLogger = require("./middleware/requestLogger");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const apiRouter = require("./routes/index");

const app = express();

// Behind Render/Vercel proxies: trust the first proxy hop so req.ip reflects
// the real client address (required for per-IP rate limiting to work).
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Strip Mongo operator characters ($, .) from body/query/params so user
// input can never be interpreted as a query operator (NoSQL injection).
// Must sit after the body parsers and before any route sees the request.
app.use(mongoSanitize());
app.use(cookieParser());
app.use(requestLogger);
if (env.ENABLE_GOOGLE_AUTH) {
  // Only initialise passport when the feature is enabled — keeps the
  // OAuth implementation in the tree but guarantees it's inert otherwise.
  const passport = require("./config/passport");
  app.use(passport.initialize());
}

app.use("/api", globalLimiter, apiRouter);

// Sentry's error handler must see errors before our errorHandler sends the
// response. It re-raises via next(err), so the app's error responses are
// unchanged — Sentry only records the event in passing.
if (Sentry) {
  Sentry.setupExpressErrorHandler(app);
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
