"use strict";

const mongoose = require("mongoose");
const logger = require("./logger");
const { env } = require("./env");

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

async function connectDB(attempt = 1) {
  try {
    await mongoose.connect(env.MONGO_URI);
    logger.info("MongoDB connected");
  } catch (err) {
    if (attempt >= MAX_RETRIES) {
      logger.error(`MongoDB connection failed after ${MAX_RETRIES} attempts: ${err.message}`);
      process.exit(1);
    }
    logger.warn(`MongoDB connection attempt ${attempt} failed. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return connectDB(attempt + 1);
  }
}

mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));
mongoose.connection.on("reconnected", () => logger.info("MongoDB reconnected"));

module.exports = connectDB;
