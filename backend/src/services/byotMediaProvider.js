"use strict";
const sharp = require("sharp");
const { cloudinary } = require("../config/cloudinary");
const ApiError = require("../utils/ApiError");
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_PIXELS = 20 * 1000 * 1000;
function configured() {
  const cfg = cloudinary.config();
  if (!cfg.cloud_name || !cfg.api_key || !cfg.api_secret)
    throw new ApiError(503, "Private photo storage is not configured");
}
async function sanitize(bytes, mime) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_BYTES)
    throw new ApiError(400, "Use an image up to 8 MB");
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime))
    throw new ApiError(400, "Only JPEG, PNG and WebP are supported");
  const magic =
    mime === "image/jpeg"
      ? bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
      : mime === "image/png"
        ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!magic) throw new ApiError(400, "Image bytes do not match JPEG, PNG or WebP");
  try {
    const pipeline = sharp(bytes, {
      limitInputPixels: MAX_PIXELS,
      failOn: "warning",
      animated: false,
    });
    const info = await pipeline.metadata();
    if (
      !["jpeg", "png", "webp"].includes(info.format) ||
      mime !== `image/${info.format}` ||
      info.pages > 1 ||
      info.width < 32 ||
      info.height < 32 ||
      info.width > 8192 ||
      info.height > 8192 ||
      info.width * info.height > MAX_PIXELS
    )
      throw new Error("Invalid image");
    // Auto-orient before stripping all metadata; preserve aspect ratio, never crop.
    const output = await pipeline
      .timeout({ seconds: 20 })
      .rotate()
      .resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 88 })
      .toBuffer();
    if (output.length > MAX_BYTES) throw new Error("Too large");
    return output;
  } catch {
    throw new ApiError(
      400,
      "Invalid image: use a single JPEG, PNG or WebP, 32–8192 pixels per side and at most 20 megapixels"
    );
  }
}
async function upload(publicId, bytes) {
  configured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: "image",
        type: "authenticated",
        overwrite: false,
        unique_filename: false,
        format: "jpg",
        allowed_formats: ["jpg"],
        timeout: 60000,
        backup: false,
        headers: "X-Robots-Tag: noindex",
      },
      (err, result) =>
        err
          ? reject(new ApiError(502, "Private photo upload failed. Please retry."))
          : resolve(result)
    );
    stream.on("error", () =>
      reject(new ApiError(502, "Private photo upload failed. Please retry."))
    );
    stream.end(bytes);
  });
}
async function inspect(publicId) {
  configured();
  try {
    return await cloudinary.api.resource(publicId, {
      timeout: 30000,
      resource_type: "image",
      type: "authenticated",
    });
  } catch {
    throw new ApiError(502, "Private photo verification is unavailable. Please retry.");
  }
}
function verify(meta, attempt) {
  if (
    !meta ||
    meta.public_id !== attempt.publicId ||
    meta.type !== "authenticated" ||
    meta.resource_type !== "image" ||
    meta.format !== "jpg" ||
    typeof meta.asset_id !== "string" ||
    !meta.asset_id ||
    !Number.isInteger(meta.bytes) ||
    meta.bytes < 1 ||
    meta.bytes > MAX_BYTES ||
    !Number.isInteger(meta.width) ||
    !Number.isInteger(meta.height) ||
    meta.width < 32 ||
    meta.height < 32 ||
    meta.width > 2560 ||
    meta.height > 2560 ||
    meta.width * meta.height > MAX_PIXELS ||
    meta.access_control?.some((rule) => rule.access_type === "anonymous")
  )
    throw new ApiError(400, "Photo did not match the authorized private image upload");
  return {
    attemptId: attempt.id,
    publicId: attempt.publicId,
    assetId: meta.asset_id,
    bytes: meta.bytes,
    width: meta.width,
    height: meta.height,
    format: meta.format,
  };
}
async function download(photo, thumbnail) {
  configured();
  // This signed provider URL NEVER leaves the backend. Authenticated storage protects
  // originals. Thumbnails are generated locally, so no public derived asset exists.
  const url = cloudinary.url(photo.publicId, {
    secure: true,
    resource_type: "image",
    type: "authenticated",
    sign_url: true,
    format: "jpg",
  });
  try {
    const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(20000) });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/"))
      throw new Error("Unavailable");
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > MAX_BYTES) throw new Error("Too large");
      chunks.push(chunk);
    }
    const bytes = Buffer.concat(chunks);
    return thumbnail
      ? sharp(bytes, { limitInputPixels: MAX_PIXELS })
          .timeout({ seconds: 20 })
          .resize({ width: 360, height: 360, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 75 })
          .toBuffer()
      : bytes;
  } catch {
    throw new ApiError(502, "Private photo could not be loaded. Please retry.");
  }
}
async function destroy(publicId) {
  configured();
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      timeout: 30000,
      resource_type: "image",
      type: "authenticated",
      invalidate: true,
    });
    if (!["ok", "not found"].includes(result.result)) throw new Error("Delete failed");
  } catch {
    throw new ApiError(502, "Private photo cleanup will retry");
  }
}
module.exports = { MAX_BYTES, configured, sanitize, upload, inspect, verify, download, destroy };
