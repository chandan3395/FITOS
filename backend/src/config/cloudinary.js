"use strict";

/**
 * Cloudinary config + helpers.
 *
 * Progress photos are uploaded *directly* from the browser to Cloudinary
 * using signed uploads — the backend never receives image bytes. This
 * module:
 *   1. Configures the SDK from env vars (validated on startup).
 *   2. Signs upload params so the browser can POST straight to Cloudinary.
 *   3. Derives display + thumbnail URLs from a publicId.
 *   4. Destroys assets (replacement / delete flows — no orphans).
 *
 * Env vars (validated in config/env.js, re-checked here for a clear error
 * if this module is required directly e.g. from a script):
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */

const { v2: cloudinary } = require("cloudinary");

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY    = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key:    API_KEY,
  api_secret: API_SECRET,
  secure:     true,
});

/** Root folder for every progress photo asset. */
const ROOT_FOLDER = "fitos";

/**
 * Deterministic folder for a (client, week) photo set, e.g.
 *   fitos/clients/<clientId>/week-<weekNumber>
 */
function folderFor(clientId, weekNumber) {
  return `${ROOT_FOLDER}/clients/${clientId}/week-${weekNumber}`;
}

/**
 * Full, predictable publicId for one slot, e.g.
 *   fitos/clients/<clientId>/week-<weekNumber>/front
 * No random suffixes — re-uploading the same slot overwrites in place.
 */
function publicIdFor(clientId, weekNumber, slot) {
  return `${folderFor(clientId, weekNumber)}/${slot}`;
}

/**
 * Build the signed payload the browser needs to upload one asset directly.
 * The signature covers exactly the params the browser must echo back (plus
 * timestamp) — Cloudinary recomputes and compares server-side.
 *
 * We sign with `public_id` (full path), `overwrite` and `invalidate` so
 * replacing an asset reuses the same id (no orphans) and busts the CDN cache.
 * `folder` is intentionally *not* signed — the full path lives in public_id,
 * which keeps ids deterministic.
 */
function buildSignedPayload(publicId, folder) {
  const timestamp = Math.round(Date.now() / 1000);

  const paramsToSign = {
    invalidate: true,
    overwrite:  true,
    public_id:  publicId,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, API_SECRET);

  return {
    timestamp,
    signature,
    apiKey:    API_KEY,
    cloudName: CLOUD_NAME,
    publicId,
    folder,
    overwrite:  true,
    invalidate: true,
  };
}

/** Sign one progress-photo slot upload — (client, week, slot). */
function signUpload({ clientId, weekNumber, slot }) {
  return buildSignedPayload(
    publicIdFor(clientId, weekNumber, slot),
    folderFor(clientId, weekNumber)
  );
}

// ── Meal check-in assets — keyed by (client, date, meal) ──────────────
//   fitos/clients/<clientId>/meals/<date>/<meal>
function mealFolderFor(clientId, date) {
  return `${ROOT_FOLDER}/clients/${clientId}/meals/${date}`;
}
function mealPublicIdFor(clientId, date, meal) {
  return `${mealFolderFor(clientId, date)}/${meal}`;
}
/** Sign one meal-photo slot upload — (client, date, meal). */
function signMealUpload({ clientId, date, meal }) {
  return buildSignedPayload(
    mealPublicIdFor(clientId, date, meal),
    mealFolderFor(clientId, date)
  );
}

/** Canonical secure delivery URL for full-size viewing. */
function urlFor(publicId) {
  return cloudinary.url(publicId, { secure: true, fetch_format: "auto", quality: "auto" });
}

/**
 * Thumbnail URL for grids / week cards / lists — square crop, downscaled,
 * auto format + quality. Derived from the publicId so the backend stays
 * authoritative over how thumbnails are generated.
 */
function thumbnailUrlFor(publicId) {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "auto" },
      { fetch_format: "auto", quality: "auto" },
    ],
  });
}

/**
 * Destroy a single asset by publicId. Best-effort: resolves either way so
 * callers can fire it without blocking the user-facing operation. Returns
 * the Cloudinary result (or null on error).
 */
async function destroy(publicId) {
  if (!publicId) return null;
  try {
    return await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[cloudinary] destroy failed", publicId, e?.message);
    return null;
  }
}

module.exports = {
  cloudinary,
  ROOT_FOLDER,
  folderFor,
  publicIdFor,
  signUpload,
  mealFolderFor,
  mealPublicIdFor,
  signMealUpload,
  urlFor,
  thumbnailUrlFor,
  destroy,
};
