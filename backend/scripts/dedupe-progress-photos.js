#!/usr/bin/env node
"use strict";

/**
 * dedupe-progress-photos.js
 *
 * One-shot maintenance script. The ProgressPhoto schema now enforces a
 * unique compound index on (clientId, weekNumber) — pre-existing data
 * may contain overlaps that would block the index build. Run this
 * before the next deploy to clean them up.
 *
 *   node scripts/dedupe-progress-photos.js          # apply changes
 *   node scripts/dedupe-progress-photos.js --dry    # report only
 *
 * Rules:
 *   • Group by (clientId, weekNumber).
 *   • Keep the NEWEST record (by createdAt, falling back to _id).
 *   • Delete every older duplicate.
 *   • For each deleted record, best-effort unlink its frontPhoto /
 *     sidePhoto / backPhoto files from disk so no orphans linger.
 *
 * Idempotent: running again on an already-clean DB reports 0
 * duplicates and exits 0.
 */

const path = require("path");
const fs   = require("fs");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { ProgressPhoto } = require("../src/schemas/ProgressPhoto.schema");
const { UPLOAD_ROOT }   = require("../src/middleware/upload");

const DRY_RUN = process.argv.includes("--dry") || process.argv.includes("--dry-run");

function pickNewest(rows) {
  // Newest by createdAt, then by _id timestamp as a tiebreaker.
  return [...rows].sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    if (tb !== ta) return tb - ta;
    return String(b._id).localeCompare(String(a._id));
  })[0];
}

async function unlinkFile(rel) {
  if (!rel) return;
  const full = path.join(UPLOAD_ROOT, path.basename(rel));
  try { await fs.promises.unlink(full); }
  catch (e) { if (e?.code !== "ENOENT") console.warn(`[dedupe] unlink ${full} failed: ${e.message}`); }
}

(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("[dedupe] MONGO_URI is not set. Aborting.");
    process.exit(1);
  }

  console.log(`[dedupe] connecting to MongoDB${DRY_RUN ? " (DRY RUN)" : ""}…`);
  await mongoose.connect(uri);

  try {
    // Aggregate groups with more than one row per (clientId, weekNumber).
    const groups = await ProgressPhoto.aggregate([
      {
        $group: {
          _id:   { clientId: "$clientId", weekNumber: "$weekNumber" },
          ids:   { $push: "$_id" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);

    let duplicatesFound   = 0;
    let duplicatesRemoved = 0;
    let filesUnlinked     = 0;

    for (const group of groups) {
      const rows = await ProgressPhoto.find({ _id: { $in: group.ids } }).lean();
      duplicatesFound += rows.length - 1; // every row except the kept one

      const keep   = pickNewest(rows);
      const losers = rows.filter((r) => String(r._id) !== String(keep._id));

      console.log(
        `[dedupe] client=${group._id.clientId} week=${group._id.weekNumber}: ` +
        `${rows.length} rows → keeping ${keep._id}, removing ${losers.length}`
      );

      if (DRY_RUN) continue;

      for (const r of losers) {
        // Unlink files first so a deletion failure doesn't leave us with
        // an orphan DB row pointing nowhere.
        for (const slot of ["frontPhoto", "sidePhoto", "backPhoto"]) {
          if (r[slot]) { await unlinkFile(r[slot]); filesUnlinked++; }
        }
      }
      const ids = losers.map((r) => r._id);
      const res = await ProgressPhoto.deleteMany({ _id: { $in: ids } });
      duplicatesRemoved += res.deletedCount || 0;
    }

    console.log("──────────────────────────────────────────────");
    console.log(`[dedupe] groups with duplicates: ${groups.length}`);
    console.log(`[dedupe] duplicates found:        ${duplicatesFound}`);
    console.log(`[dedupe] duplicates removed:      ${DRY_RUN ? "0 (dry run)" : duplicatesRemoved}`);
    console.log(`[dedupe] files unlinked:          ${DRY_RUN ? "0 (dry run)" : filesUnlinked}`);
    if (DRY_RUN && duplicatesFound > 0) {
      console.log("[dedupe] re-run without --dry to apply.");
    } else if (duplicatesFound === 0) {
      console.log("[dedupe] DB is already clean — safe to build the unique index.");
    } else {
      console.log("[dedupe] DB cleaned — the unique (clientId, weekNumber) index can now build.");
    }
  } finally {
    await mongoose.disconnect();
  }
})().catch((err) => {
  console.error("[dedupe] failed:", err);
  process.exit(1);
});
