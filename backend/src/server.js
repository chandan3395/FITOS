"use strict";

const http = require("http");
const mongoose = require("mongoose");
const { validateEnv, env } = require("./config/env");

validateEnv();

const app = require("./app");
const logger = require("./config/logger");
const connectDB = require("./config/database");
const { initSocket } = require("./socket");

let server;

async function start() {
  await connectDB();
  await require("./schemas/User.schema").User.createIndexes();
  // Identity constraints must exist before accepting BYOT traffic.
  await require("./schemas/ByotProfile.schema").ByotProfile.createIndexes();
  if (env.ENABLE_GOOGLE_AUTH) await require("./utils/oauthState").OAuthState.createIndexes();

  const { ByotNutritionPlan, ByotFoodLog } = require("./schemas/ByotNutrition.schema");
  await Promise.all([ByotNutritionPlan.createIndexes(), ByotFoodLog.createIndexes()]);
  const { ByotWorkoutRoutine, ByotDailyWorkout } = require("./schemas/ByotWorkout.schema");
  await Promise.all([ByotWorkoutRoutine.createIndexes(), ByotDailyWorkout.createIndexes()]);
  const { ByotProgress, ByotPhotoAttempt, ByotPhotoBudget } = require("./schemas/ByotProgress.schema");
  await Promise.all([ByotProgress.createIndexes(), ByotPhotoAttempt.createIndexes(), ByotPhotoBudget.createIndexes()]);

  // Socket.IO attaches to the same HTTP server as Express so REST and the
  // realtime messaging layer share one port and the same JWT auth.
  server = http.createServer(app);
  initSocket(server);

  server.listen(env.PORT, () => {
    logger.info(`FITOS backend running on http://localhost:${env.PORT}`);
  });
}

const SHUTDOWN_TIMEOUT_MS = 10_000;
let shuttingDown = false;

// Close the HTTP server (stops accepting connections; waits for in-flight
// requests) and the Mongo connection, then exit. Open sockets — e.g. idle
// Socket.IO connections — can keep server.close() from ever resolving, so a
// timer force-exits if shutdown hangs.
function shutdown(reason, exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Shutting down (${reason})`);

  const force = setTimeout(() => {
    logger.error(`Shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms — forcing exit`);
    process.exit(exitCode || 1);
  }, SHUTDOWN_TIMEOUT_MS);
  force.unref();

  (async () => {
    try {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
      await mongoose.connection.close();
      logger.info("Shutdown complete");
      process.exit(exitCode);
    } catch (err) {
      logger.error("Error during shutdown", err);
      process.exit(1);
    }
  })();
}

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", reason instanceof Error ? reason : { reason: String(reason) });
  shutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", err);
  shutdown("uncaughtException", 1);
});

process.on("SIGTERM", () => shutdown("SIGTERM", 0));
process.on("SIGINT", () => shutdown("SIGINT", 0));

start();
