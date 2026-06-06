"use strict";

const mongoose = require("mongoose");
const { Client } = require("../schemas/Client.schema");
const ApiError = require("../utils/ApiError");
const cloudinary = require("../config/cloudinary");

const SLOTS = ["front", "side", "back"];

/**
 * Mirror of progressPhoto.service access rules — a caller may only obtain
 * an upload signature for a client they own / are.
 */
async function assertClientAccess(clientId, user) {
  if (!mongoose.isValidObjectId(clientId)) throw new ApiError(400, "Invalid clientId");
  const client = await Client.findById(clientId);
  if (!client) throw new ApiError(404, "Client not found");
  if (user.role === "ADMIN") return client;
  if (user.role === "TRAINER" && String(client.trainerId) === String(user._id)) return client;
  if (user.role === "CLIENT"  && String(client.userId)    === String(user._id)) return client;
  throw new ApiError(403, "Forbidden");
}

async function resolveCurrentClient(user) {
  if (user.role !== "CLIENT") throw new ApiError(403, "Forbidden");
  const client = await Client.findOne({ userId: user._id });
  if (!client) throw new ApiError(404, "Client record not found");
  return client;
}

/**
 * POST /api/uploads/sign
 * Returns a signed payload the browser uses to upload one progress-photo
 * slot directly to Cloudinary. The publicId is deterministic per
 * (client, week, slot) so re-uploading overwrites in place.
 */
async function signProgressPhoto(user, body) {
  // CLIENT signs for self; TRAINER/ADMIN pass an explicit clientId.
  let client;
  if (user.role === "CLIENT") {
    client = await resolveCurrentClient(user);
  } else {
    client = await assertClientAccess(body.clientId, user);
  }

  const weekNumber = Number(body.weekNumber);
  if (!weekNumber || weekNumber < 1) throw new ApiError(400, "weekNumber is required");

  const slot = String(body.slot || "").toLowerCase();
  if (!SLOTS.includes(slot)) {
    throw new ApiError(400, `slot must be one of: ${SLOTS.join(", ")}`);
  }

  return cloudinary.signUpload({ clientId: client._id, weekNumber, slot });
}

module.exports = { signProgressPhoto, SLOTS };
