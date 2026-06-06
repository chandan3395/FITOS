import axios from "axios";
import api from "../lib/api";
import { compressImage } from "../lib/imageCompression";

/**
 * Signed direct-to-Cloudinary uploads for progress photos.
 *
 * Flow per slot:
 *   1. Ask our backend to sign the upload (POST /api/uploads/sign).
 *   2. Compress the image in the browser (WebP, max 1200px, q0.8).
 *   3. POST the bytes straight to Cloudinary — never through our server.
 *   4. Return the resulting publicId so the caller can persist metadata.
 */

/** Get a signed payload for one (client, week, slot). */
async function sign({ clientId, weekNumber, slot }) {
  const res = await api.post("/uploads/sign", { clientId, weekNumber, slot });
  return res.data?.data;
}

/**
 * Upload one compressed File directly to Cloudinary using a signed payload.
 * Uses a bare axios call (no auth header / no /api baseURL) since the
 * request goes to Cloudinary, not our backend.
 */
async function uploadToCloudinary(file, sig) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", sig.apiKey);
  fd.append("timestamp", sig.timestamp);
  fd.append("signature", sig.signature);
  fd.append("public_id", sig.publicId);
  fd.append("overwrite", String(sig.overwrite));
  fd.append("invalidate", String(sig.invalidate));

  const endpoint = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;
  const res = await axios.post(endpoint, fd, { timeout: 60000 });
  return res.data; // { public_id, secure_url, ... }
}

/**
 * Compress + sign + upload one slot. Returns the slot metadata our backend
 * expects ({ publicId, url }) or null if no file was provided.
 */
async function uploadSlot({ clientId, weekNumber, slot, file }) {
  if (!file) return null;
  const compressed = await compressImage(file);
  const sig = await sign({ clientId, weekNumber, slot });
  const result = await uploadToCloudinary(compressed, sig);
  return { publicId: result.public_id, url: result.secure_url };
}

const uploadService = { sign, uploadToCloudinary, uploadSlot };
export default uploadService;
