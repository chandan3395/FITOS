#!/usr/bin/env node
"use strict";

/**
 * migrate-photos-to-cloudinary.js
 *
 * One-shot migration. Progress photos moved from local disk (/uploads/<file>)
 * to Cloudinary (signed direct uploads). Legacy ProgressPhoto records store
 * each slot as a string path; the new schema stores a { publicId, url,
 * thumbnailUrl } subdocument.
 *
 * This script audits every record, and for each legacy string slot:
 *   1. Resolves the on-disk file under uploads/.
 *   2. Uploads it to Cloudinary at the deterministic publicId
 *      (fitos/clients/<clientId>/week-<week>/<slot>).
 *   3. Rewrites the slot to the new subdocument shape.
 *
 * Usage:
 *   node scripts/migrate-photos-to-cloudinary.js          # apply
 *   node scripts/migrate-photos-to-cloudinary.js --dry    # audit only
 *
 * Behaviour for missing local files: reported and the slot is left as-is so
 * nothing is silently destroyed. Re-run after restoring files if needed.
 * Idempotent: slots already in the new object shape are skipped.
 */

const path = require("path");
const fs   = require("fs");
const mongoose = require("mongoose");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { ProgressPhoto } = require("../src/schemas/ProgressPhoto.schema");
const cloudinary        = require("../src/config/cloudinary");

// The local-disk upload path was removed from the app (photos live on
// Cloudinary now); this one-shot script keeps its own copy of the legacy
// uploads location so it can still resolve old files if ever re-run.
const UPLOAD_ROOT = path.join(__dirname, "../uploads");

const DRY_RUN = process.argv.includes("--dry") || process.argv.includes("--dry-run");
const SLOTS = [["front", "frontPhoto"], ["side", "sidePhoto"], ["back", "backPhoto"]];

async function uploadLegacy(localRel, publicId) {
  const full = path.join(UPLOAD_ROOT, path.basename(localRel));
  if (!fs.existsSync(full)) return { missing: true, full };
  const res = await cloudinary.cloudinary.uploader.upload(full, {
    public_id:  publicId,
    overwrite:  true,
    invalidate: true,
    resource_type: "image",
  });
  return {
    publicId:     res.public_id,
    url:          cloudinary.urlFor(res.public_id),
    thumbnailUrl: cloudinary.thumbnailUrlFor(res.public_id),
  };
}

(async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("[migrate] MONGO_URI is not set. Aborting.");
    process.exit(1);
  }

  console.log(`[migrate] connecting to MongoDB${DRY_RUN ? " (DRY RUN)" : ""}…`);
  await mongoose.connect(uri);

  let recordsScanned = 0;
  let slotsMigrated  = 0;
  let slotsMissing   = 0;
  let slotsAlready   = 0;

  try {
    // .lean() returns raw BSON — legacy string slots come through unchanged
    // instead of being cast to the new subdocument schema.
    const docs = await ProgressPhoto.find({}).lean();

    for (const doc of docs) {
      recordsScanned++;
      const update = {};

      for (const [slot, field] of SLOTS) {
        const val = doc[field];
        if (!val) continue;

        // Already migrated (object with publicId) — skip.
        if (typeof val === "object" && val.publicId) { slotsAlready++; continue; }
        if (typeof val !== "string") continue;

        const publicId = cloudinary.publicIdFor(doc.clientId, doc.weekNumber, slot);
        console.log(`[migrate] ${doc._id} ${slot}: ${val} → ${publicId}`);

        if (DRY_RUN) { slotsMigrated++; continue; }

        const result = await uploadLegacy(val, publicId);
        if (result.missing) {
          console.warn(`[migrate]   ! local file missing: ${result.full} — leaving slot untouched`);
          slotsMissing++;
          continue;
        }
        update[field] = result;
        slotsMigrated++;
      }

      if (!DRY_RUN && Object.keys(update).length) {
        await ProgressPhoto.collection.updateOne({ _id: doc._id }, { $set: update });
      }
    }

    console.log("──────────────────────────────────────────────");
    console.log(`[migrate] records scanned:      ${recordsScanned}`);
    console.log(`[migrate] slots migrated:       ${DRY_RUN ? `${slotsMigrated} (dry run)` : slotsMigrated}`);
    console.log(`[migrate] slots already new:    ${slotsAlready}`);
    console.log(`[migrate] slots missing files:  ${slotsMissing}`);
    if (DRY_RUN && slotsMigrated > 0) console.log("[migrate] re-run without --dry to apply.");
    if (slotsMissing > 0) console.log("[migrate] some local files were missing — restore them and re-run, or delete those records manually.");
  } finally {
    await mongoose.disconnect();
  }
})().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
