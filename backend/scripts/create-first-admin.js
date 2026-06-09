#!/usr/bin/env node
"use strict";

/**
 * create-first-admin.js
 *
 * One-time bootstrap: create the very first ADMIN account so someone can
 * sign in at /api/auth/admin/login. Admins are the only role that uses
 * email + password (trainers and clients sign in with Google), and there
 * is no public "create admin" path until at least one admin exists — hence
 * this script.
 *
 * Reads its inputs from the environment (never hardcoded):
 *   ADMIN_NAME      display name
 *   ADMIN_EMAIL     login email (lowercased/trimmed to match createAdmin)
 *   ADMIN_PASSWORD  plaintext password (hashed here, never logged)
 *
 * Idempotent: if a user with that email already exists, it logs and exits
 * without creating a duplicate.
 *
 *   ADMIN_NAME="..." ADMIN_EMAIL="..." ADMIN_PASSWORD="..." npm run create-admin
 */

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

// `config/env` loads dotenv (backend/.env) and exposes `env`. We require it
// for env.MONGO_URI but intentionally do NOT call validateEnv(), so this
// bootstrap script doesn't demand unrelated vars (Cloudinary, OAuth, …).
const { env } = require("../src/config/env");
// Reuse the project's exact connection logic (retry/backoff + logging).
const connectDB = require("../src/config/database");
const { User } = require("../src/schemas/User.schema");

// Same bcrypt cost factor used in src/controllers/auth.controller.js.
const BCRYPT_COST = 12;

async function main() {
  const name = String(process.env.ADMIN_NAME || "").trim();
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  // Validate inputs (without ever echoing the password).
  const missing = [];
  if (!name) missing.push("ADMIN_NAME");
  if (!email) missing.push("ADMIN_EMAIL");
  if (!password) missing.push("ADMIN_PASSWORD");
  if (missing.length) {
    console.error(`[create-admin] Missing required env var(s): ${missing.join(", ")}`);
    process.exit(1);
  }
  if (typeof password !== "string" || password.length < 8) {
    console.error("[create-admin] ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  await connectDB();

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      console.log(
        `[create-admin] A user with email ${email} already exists (role: ${existing.role}). ` +
        "No changes made."
      );
      return;
    }

    const hashed = await bcrypt.hash(password, BCRYPT_COST);
    await User.create({
      name,
      email,
      password: hashed,
      role: "ADMIN",
      isActive: true,
    });

    console.log(`[create-admin] ✅ Admin created successfully: ${email}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("[create-admin] Failed:", err.message);
  process.exit(1);
});
