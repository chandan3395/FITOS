"use strict";

const http = require("http");
const { validateEnv, env } = require("./config/env");

validateEnv();

const app = require("./app");
const logger = require("./config/logger");
const connectDB = require("./config/database");
const { initSocket } = require("./socket");

async function start() {
  await connectDB();

  // Socket.IO attaches to the same HTTP server as Express so REST and the
  // realtime messaging layer share one port and the same JWT auth.
  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.PORT, () => {
    logger.info(`FITOS backend running on http://localhost:${env.PORT}`);
  });
}

start();
