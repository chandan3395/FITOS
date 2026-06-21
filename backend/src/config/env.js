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

  // Custom-scheme deep link the Flutter mobile app listens on to receive the
  // JWT after Google OAuth. Optional — defaults to the documented scheme so the
  // mobile flow works out of the box; web (CLIENT_ORIGIN) is unaffected.
  MOBILE_CALLBACK: process.env.MOBILE_CALLBACK || "fitos://auth-callback",
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

  // WhatsApp Cloud API (Meta). Optional — when unset, the WhatsApp service
  // reports "not configured" instead of failing startup, so the rest of the
  // app keeps working without WhatsApp credentials in dev/test.
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
};

module.exports = { validateEnv, env };
