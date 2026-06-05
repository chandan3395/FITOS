"use strict";

const { env } = require("./env");

const corsOptions = {
  origin: env.CLIENT_ORIGIN,
  credentials: true,
};

module.exports = corsOptions;
