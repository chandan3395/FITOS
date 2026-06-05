"use strict";

const { validateEnv, env } = require("./config/env");

validateEnv();

const app = require("./app");
const logger = require("./config/logger");
const connectDB = require("./config/database");

async function start() {
  await connectDB();
  app.listen(env.PORT, () => {
    logger.info(`FITOS backend running on http://localhost:${env.PORT}`);
  });
}

start();
