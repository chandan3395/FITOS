/**
 * Browser-side image compression for progress-photo uploads.
 *
 * Runs before the direct-to-Cloudinary upload so we ship small, consistent
 * assets and the backend never touches image bytes. Rules (per spec):
 *   • Max width 1200px, aspect ratio preserved
 *   • Convert to WebP
 *   • Quality 0.8
 *   • Target 300KB–1MB
 *
 * Falls back to the original File if the browser can't produce a WebP blob
 * (very old browsers) — the upload still works, just larger.
 */

const MAX_WIDTH = 1200;
const QUALITY = 0.8;
const MIME = "image/webp";

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

/**
 * Compress an image File to a WebP File. Returns the original File unchanged
 * if it isn't an image or compression fails.
 *
 * @param {File} file
 * @returns {Promise<File>}
 */
export async function compressImage(file) {
  if (!file || !file.type?.startsWith("image/")) return file;

  try {
    const img = await loadImage(file);

    const scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
    const width  = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, MIME, QUALITY)
    );
    if (!blob) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: MIME, lastModified: Date.now() });
  } catch {
    return file;
  }
}

export default compressImage;
