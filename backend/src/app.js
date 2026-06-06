"use strict";

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const corsOptions = require("./config/cors");
const requestLogger = require("./middleware/requestLogger");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const apiRouter = require("./routes/index");
const { env } = require("./config/env");
const { UPLOAD_ROOT } = require("./middleware/upload");

const app = express();

// helmet's default crossOriginResourcePolicy blocks images served from
// /uploads when the frontend lives on a different origin during dev.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);
if (env.ENABLE_GOOGLE_AUTH) {
  // Only initialise passport when the feature is enabled — keeps the
  // OAuth implementation in the tree but guarantees it's inert otherwise.
  const passport = require("./config/passport");
  app.use(passport.initialize());
}

app.use("/api", apiRouter);

// Serve uploaded files. Path is also configured in upload middleware.
app.use("/uploads", express.static(UPLOAD_ROOT, { fallthrough: true }));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
