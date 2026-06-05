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

const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);
app.use(passport.initialize());

app.use("/api", apiRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
