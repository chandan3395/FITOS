"use strict";

const crypto = require("crypto");
const mongoose = require("mongoose");
const { Client } = require("../schemas/Client.schema");
const { ClientInvite } = require("../schemas/ClientInvite.schema");
const { User } = require("../schemas/User.schema");
const ApiError = require("../utils/ApiError");
const { env } = require("../config/env");

const CLIENT_FIELDS = [
  "name",
  "phone",
  "gender",
  "age",
  "city",
  "height",
  "startingWeight",
  "targetWeight",
  "goal",
];

async function resolveTrainerId(user, body) {
  if (user.role === "ADMIN") {
    if (!body.trainerId) {
      throw new ApiError(400, "trainerId is required when admin creates a client");
    }
    if (!mongoose.isValidObjectId(body.trainerId)) {
      throw new ApiError(400, "Invalid trainerId");
    }
    const trainer = await User.findOne({ _id: body.trainerId, role: "TRAINER" });
    if (!trainer) {
      throw new ApiError(404, "Trainer not found");
    }
    return trainer._id;
  }

  // TRAINER — never trust request body
  return user._id;
}

function validateRequiredFields(body) {
  const missing = ["name", "phone", "goal"].filter(
    (field) => !body[field] || String(body[field]).trim() === ""
  );
  if (missing.length) {
    throw new ApiError(400, `Missing required fields: ${missing.join(", ")}`);
  }
}

async function createClient(user, body) {
  validateRequiredFields(body);

  const trainerId = await resolveTrainerId(user, body);

  const data = { trainerId };
  CLIENT_FIELDS.forEach((field) => {
    if (body[field] !== undefined) data[field] = body[field];
  });
  if (body.email) data.email = String(body.email).trim().toLowerCase();

  const client = await Client.create(data);

  // Auto-issue an activation invite. Token is a cryptographically random
  // 32-byte hex string; the trainer shares the resulting URL with the client.
  const inviteToken = crypto.randomBytes(32).toString("hex");
  const expiresAt   = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

  await ClientInvite.create({
    trainerId,
    clientName: client.name,
    phone:      client.phone,
    email:      client.email,
    inviteToken,
    expiresAt,
  });

  const activationUrl = `${env.CLIENT_ORIGIN}/activate/${inviteToken}`;
  return { client, invite: { token: inviteToken, expiresAt, activationUrl } };
}

// Phase 5 — Privacy rule:
// Admins are platform operators and MUST NOT access individual client records.
// Only the owning TRAINER may list or retrieve clients. CLIENT role is forbidden.

async function listClientsForTrainer(trainerUser) {
  return Client.find({ trainerId: trainerUser._id }).sort({ createdAt: -1 });
}

async function getClientForTrainer(clientId, trainerUser) {
  if (!mongoose.isValidObjectId(clientId)) {
    throw new ApiError(400, "Invalid client id");
  }

  const client = await Client.findById(clientId);
  if (!client) {
    throw new ApiError(404, "Client not found");
  }

  // Ownership check — trainer can only see their own clients.
  if (String(client.trainerId) !== String(trainerUser._id)) {
    throw new ApiError(403, "Forbidden");
  }

  return client;
}

/**
 * PATCH /api/clients/:id
 * Update editable client fields. Ownership: trainer can only touch
 * their own client; admin can touch any. Trainer cannot reassign
 * `trainerId` via this endpoint.
 */
async function updateClient(id, user, body) {
  const client = await getClientForTrainer(id, user).catch(async (err) => {
    // Admin may not own the doc — getClientForTrainer would throw 403
    // for non-admin trainers, but if user.role === "ADMIN" we want to
    // bypass that check. Re-fetch directly for admin.
    if (user.role === "ADMIN") {
      if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid client id");
      const c = await Client.findById(id);
      if (!c) throw new ApiError(404, "Client not found");
      return c;
    }
    throw err;
  });

  const ALLOWED = [
    "name", "phone", "gender", "age", "city", "height",
    "startingWeight", "targetWeight", "goal", "status",
  ];
  for (const k of ALLOWED) {
    if (body[k] !== undefined) client[k] = body[k];
  }

  // Validate status if provided
  if (body.status && !["ACTIVE", "ARCHIVED"].includes(body.status)) {
    throw new ApiError(400, "status must be ACTIVE or ARCHIVED");
  }

  await client.save();
  return client;
}

module.exports = { createClient, listClientsForTrainer, getClientForTrainer, updateClient };
