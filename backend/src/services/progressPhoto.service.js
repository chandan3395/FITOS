"use strict";

const mongoose = require("mongoose");
const { ProgressPhoto } = require("../schemas/ProgressPhoto.schema");
const { Client } = require("../schemas/Client.schema");
const ApiError = require("../utils/ApiError");

async function assertClientAccess(clientId, user) {
  if (!mongoose.isValidObjectId(clientId)) throw new ApiError(400, "Invalid clientId");
  const client = await Client.findById(clientId);
  if (!client) throw new ApiError(404, "Client not found");
  if (user.role !== "ADMIN" && String(client.trainerId) !== String(user._id)) {
    throw new ApiError(403, "Forbidden");
  }
  return client;
}

function fileToPath(file) {
  return file ? `/uploads/${file.filename}` : undefined;
}

/**
 * POST /api/progress-photos
 * Body  (multipart): clientId, weekNumber
 * Files: front, side, back (any subset)
 */
async function create(user, body, files = {}) {
  const client = await assertClientAccess(body.clientId, user);
  const weekNumber = Number(body.weekNumber);
  if (!weekNumber || weekNumber < 1) throw new ApiError(400, "weekNumber is required");

  const front = files.front?.[0];
  const side  = files.side?.[0];
  const back  = files.back?.[0];
  if (!front && !side && !back) throw new ApiError(400, "At least one photo is required");

  const doc = await ProgressPhoto.create({
    clientId:   client._id,
    trainerId:  client.trainerId,
    weekNumber,
    frontPhoto: fileToPath(front),
    sidePhoto:  fileToPath(side),
    backPhoto:  fileToPath(back),
    status:     "PENDING",
  });

  return doc;
}

async function listForClient(clientId, user) {
  await assertClientAccess(clientId, user);
  return ProgressPhoto.find({ clientId }).sort({ weekNumber: -1, createdAt: -1 });
}

async function comment(id, user, { comment }) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  const doc = await ProgressPhoto.findById(id);
  if (!doc) throw new ApiError(404, "Progress photo not found");
  if (user.role !== "ADMIN" && String(doc.trainerId) !== String(user._id)) {
    throw new ApiError(403, "Forbidden");
  }
  if (user.role !== "TRAINER" && user.role !== "ADMIN") {
    throw new ApiError(403, "Only trainers may comment");
  }
  doc.comment = comment ?? doc.comment;
  doc.status  = "REVIEWED";
  await doc.save();
  return doc;
}

module.exports = { create, listForClient, comment };
