#!/usr/bin/env node
"use strict";

/**
 * remove-dev-users.js
 *
 * One-shot production-hardening cleanup. Earlier builds had a dev auth
 * bypass that auto-provisioned synthetic users:
 *   dev-admin@fitos.local
 *   dev-trainer@fitos.local
 *   dev-client@fitos.local
 * (and per-client dev-client-<id>@fitos.local stand-ins).
 *
 * This script removes ONLY those synthetic accounts. Real admins,
 * trainers, and clients are never touched. It also un-links any Client
 * doc whose `userId` pointed at a removed synthetic user, so those
 * clients can be re-activated normally.
 *
 *   node scripts/remove-dev-users.js          # apply
 *   node scripts/remove-dev-users.js --dry    # report only
 *
 * Idempotent: running again on a clean DB reports 0 and exits 0.
 */

const path = require("path");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { User } = require("../src/schemas/User.schema");
const { Client } = require("../src/schemas/Client.schema");

const DRY_RUN = process.argv.includes("--dry") || process.argv.includes("--dry-run");

// Matches dev-admin@fitos.local, dev-trainer@fitos.local,
// dev-client@fitos.local, and dev-client-<id>@fitos.local.
const DEV_EMAIL_RE = /^dev-(admin|trainer|client)(-[a-f0-9]+)?@fitos\.local$/i;

(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("[remove-dev-users] MONGO_URI is not set. Aborting.");
    process.exit(1);
  }

  console.log(`[remove-dev-users] connecting to MongoDB${DRY_RUN ? " (DRY RUN)" : ""}…`);
  await mongoose.connect(uri);

  try {
    const devUsers = await User.find({ email: DEV_EMAIL_RE }, "name email role").lean();

    if (devUsers.length === 0) {
      console.log("[remove-dev-users] no synthetic dev users found — DB is clean.");
      return;
    }

    console.log(`[remove-dev-users] found ${devUsers.length} synthetic dev user(s):`);
    for (const u of devUsers) console.log(`  - ${u.email} (${u.role}) ${u._id}`);

    if (DRY_RUN) {
      console.log("[remove-dev-users] dry run — re-run without --dry to apply.");
      return;
    }

    const ids = devUsers.map((u) => u._id);

    // Un-link any clients that referenced a synthetic user.
    const unlink = await Client.updateMany(
      { userId: { $in: ids } },
      { $set: { userId: null } }
    );
    console.log(`[remove-dev-users] un-linked ${unlink.modifiedCount} client(s).`);

    const del = await User.deleteMany({ _id: { $in: ids } });
    console.log(`[remove-dev-users] removed ${del.deletedCount} synthetic user(s).`);
  } finally {
    await mongoose.disconnect();
  }
})().catch((err) => {
  console.error("[remove-dev-users] failed:", err);
  process.exit(1);
});
