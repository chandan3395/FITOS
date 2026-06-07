#!/usr/bin/env node
"use strict";

/**
 * seed-qa-users.js
 *
 * Creates REAL database accounts used by the development-only QA panel's
 * "Quick Login As …" buttons. These are normal users with a real hashed
 * password — they log in through the real /api/auth/login endpoint and
 * receive real JWTs. This is NOT an auth bypass.
 *
 * Accounts (idempotent upsert):
 *   qa-admin@fitos.local    ADMIN
 *   qa-trainer@fitos.local  TRAINER
 *   qa-client@fitos.local   CLIENT  (+ a Client doc owned by qa-trainer,
 *                                     linked to this user so client-scoped
 *                                     pages resolve)
 *
 * Password: process.env.QA_PASSWORD || "qa-password-123" (must match the
 * value baked into the frontend QA panel).
 *
 *   node scripts/seed-qa-users.js
 *
 * NEVER run against production data. Intended for local/dev databases only.
 */

const path = require("path");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { User } = require("../src/schemas/User.schema");
const { Client } = require("../src/schemas/Client.schema");

const QA_PASSWORD = process.env.QA_PASSWORD || "qa-password-123";

const ACCOUNTS = [
  { email: "qa-admin@fitos.local",   name: "QA Admin",   role: "ADMIN" },
  { email: "qa-trainer@fitos.local", name: "QA Trainer", role: "TRAINER" },
  { email: "qa-client@fitos.local",  name: "QA Client",  role: "CLIENT" },
];

async function upsertUser({ email, name, role }, hashed) {
  let user = await User.findOne({ email });
  if (user) {
    user.name = name;
    user.role = role;
    user.password = hashed;
    user.isActive = true;
    await user.save();
    console.log(`[seed-qa] updated ${email} (${role})`);
  } else {
    user = await User.create({ email, name, role, password: hashed, isActive: true });
    console.log(`[seed-qa] created ${email} (${role})`);
  }
  return user;
}

(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("[seed-qa] MONGO_URI is not set. Aborting.");
    process.exit(1);
  }
  if (process.env.NODE_ENV === "production") {
    console.error("[seed-qa] Refusing to run with NODE_ENV=production.");
    process.exit(1);
  }

  console.log("[seed-qa] connecting to MongoDB…");
  await mongoose.connect(uri);

  try {
    const hashed = await bcrypt.hash(QA_PASSWORD, 12);

    const users = {};
    for (const acct of ACCOUNTS) {
      users[acct.role] = await upsertUser(acct, hashed);
    }

    // Ensure the QA client has a Client doc owned by the QA trainer and
    // linked to the QA client user, so client-scoped pages have data.
    const trainer = users.TRAINER;
    const clientUser = users.CLIENT;
    let clientDoc = await Client.findOne({ userId: clientUser._id });
    if (!clientDoc) {
      clientDoc = await Client.findOne({ trainerId: trainer._id, name: "QA Client" });
    }
    if (!clientDoc) {
      clientDoc = await Client.create({
        trainerId: trainer._id,
        name: "QA Client",
        email: clientUser.email,
        userId: clientUser._id,
        status: "ACTIVE",
        goal: "QA testing",
      });
      console.log("[seed-qa] created Client doc for QA Client");
    } else {
      clientDoc.trainerId = trainer._id;
      clientDoc.userId = clientUser._id;
      await clientDoc.save();
      console.log("[seed-qa] linked existing Client doc for QA Client");
    }

    console.log("──────────────────────────────────────────────");
    console.log("[seed-qa] done. QA credentials:");
    for (const a of ACCOUNTS) console.log(`  ${a.email} / ${QA_PASSWORD}`);
  } finally {
    await mongoose.disconnect();
  }
})().catch((err) => {
  console.error("[seed-qa] failed:", err);
  process.exit(1);
});
