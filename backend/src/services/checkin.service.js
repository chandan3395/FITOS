"use strict";

const mongoose = require("mongoose");
const { CheckIn, CHECKIN_STATUSES } = require("../schemas/CheckIn.schema");
const { Client } = require("../schemas/Client.schema");
const ApiError = require("../utils/ApiError");

/** Verifies the trainer owns the client (admin bypasses). */
async function assertClientAccess(clientId, user) {
  if (!mongoose.isValidObjectId(clientId)) throw new ApiError(400, "Invalid clientId");
  const client = await Client.findById(clientId);
  if (!client) throw new ApiError(404, "Client not found");
  if (user.role !== "ADMIN" && String(client.trainerId) !== String(user._id)) {
    throw new ApiError(403, "Forbidden");
  }
  return client;
}

/**
 * POST /api/checkins
 * Trainer creates a check-in on behalf of a client (prototype shortcut —
 * a future client app would POST directly). Body: { clientId, weight, sleep, ... }
 */
async function create(user, body) {
  const client = await assertClientAccess(body.clientId, user);

  const data = {
    clientId:  client._id,
    trainerId: client.trainerId,
    weight:    body.weight,
    sleep:     body.sleep,
    water:     body.water,
    energy:    body.energy,
    mood:      body.mood,
    notes:     body.notes,
    status:    "PENDING",
  };

  const doc = await CheckIn.create(data);
  return doc;
}

/**
 * GET /api/checkins
 * Trainer: own check-ins, optional ?status=&clientId= filters.
 * Client role: forbidden (admin privacy rule + clients reach their own
 * data via /api/me/* once that exists; out of scope for this pass).
 */
async function list(user, { status, clientId, limit = 50 } = {}) {
  if (user.role !== "TRAINER" && user.role !== "ADMIN") {
    throw new ApiError(403, "Forbidden");
  }

  const filter = {};
  if (user.role === "TRAINER") filter.trainerId = user._id;
  if (status) {
    if (!CHECKIN_STATUSES.includes(status)) throw new ApiError(400, "Invalid status");
    filter.status = status;
  }
  if (clientId) {
    if (!mongoose.isValidObjectId(clientId)) throw new ApiError(400, "Invalid clientId");
    filter.clientId = clientId;
  }

  return CheckIn.find(filter)
    .populate("clientId", "name goal")
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 200));
}

async function getById(id, user) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid id");
  const doc = await CheckIn.findById(id).populate("clientId", "name goal trainerId");
  if (!doc) throw new ApiError(404, "Check-in not found");
  if (user.role !== "ADMIN" && String(doc.trainerId) !== String(user._id)) {
    throw new ApiError(403, "Forbidden");
  }
  return doc;
}

/**
 * PATCH /api/checkins/:id/review
 * Body: { status: "REVIEWED" | "FLAGGED", trainerComment? }
 */
async function review(id, user, body) {
  const doc = await getById(id, user);
  if (user.role !== "TRAINER") throw new ApiError(403, "Only trainers may review check-ins");

  const next = body.status;
  if (next && !["REVIEWED", "FLAGGED"].includes(next)) {
    throw new ApiError(400, "status must be REVIEWED or FLAGGED");
  }

  if (next) doc.status = next;
  if (body.trainerComment !== undefined) doc.trainerComment = body.trainerComment;
  doc.reviewedAt = new Date();

  await doc.save();
  return doc;
}

module.exports = { create, list, getById, review };
