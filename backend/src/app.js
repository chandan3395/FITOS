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
const passport = require("./config/passport");
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
app.use(passport.initialize());

app.use("/api", apiRouter);

// Serve uploaded files. Path is also configured in upload middleware.
app.use("/uploads", express.static(UPLOAD_ROOT, { fallthrough: true }));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
