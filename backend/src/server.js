"use strict";

const { validateEnv, env } = require("./config/env");

validateEnv();

const app = require("./app");
const logger = require("./config/logger");

app.listen(env.PORT, () => {
  logger.info(`FITOS backend running on http://localhost:${env.PORT}`);
});
