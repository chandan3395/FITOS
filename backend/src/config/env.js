"use strict";

const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });

// Google OAuth credentials are only required when the feature is enabled.
const ENABLE_GOOGLE_AUTH = process.env.ENABLE_GOOGLE_AUTH !== "false";

const REQUIRED = ["PORT", "MONGO_URI", "JWT_SECRET", "JWT_REFRESH_SECRET"];
if (ENABLE_GOOGLE_AUTH) {
  REQUIRED.push("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_CALLBACK_URL");
}

// Cloudinary backs progress-photo storage (signed direct uploads). All
// three are required — fail fast so a misconfigured deploy never silently
// breaks uploads at runtime.
REQUIRED.push("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET");

function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
  ENABLE_GOOGLE_AUTH,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};

module.exports = { validateEnv, env };
