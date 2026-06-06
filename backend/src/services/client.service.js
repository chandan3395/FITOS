"use strict";

const crypto = require("crypto");
const mongoose = require("mongoose");
const { Client } = require("../schemas/Client.schema");
const { ClientInvite } = require("../schemas/ClientInvite.schema");
const { User } = require("../schemas/User.schema");
const ApiError = require("../utils/ApiError");
const { env } = require("../config/env");
const { validateClientPayload } = require("../validators/clientPayload.validator");

// Single source of truth for fields the wizard collects AND the schema
// persists. The validator gates every field before it gets here; the
// service simply copies. Keep this list aligned with `Client.schema.js`
// — the `clientFields.contract.test.js` suite enforces the alignment.
const PERSISTED_CLIENT_FIELDS = [
  // Identity
  "name", "phone", "email", "gender", "dob", "age", "city", "occupation",

  // Body
  "height", "startingWeight", "bodyFat",

  // Health history
  "medicalConditions", "medications", "pastInjuries", "allergies",

  // Goal & program
  "goal", "targetWeight", "targetBodyFat", "timeline", "goalDescription",
  "startDate", "duration", "sessionFrequency",

  // Nutrition
  "diet", "calories", "protein", "carbs", "fats",
  "mealsPerDay", "waterTarget", "cheatMeals",
  "foodDislikes", "eatingHabits",

  // Trainer notes
  "privateNotes",
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

async function createClient(user, body) {
  // Authoritative validation — backend NEVER trusts the frontend.
  const result = validateClientPayload(body);
  if (!result.ok) {
    throw ApiError.validation(result.errors);
  }
  const value = result.value;

  // resolveTrainerId still consults the raw body for `trainerId` (admin
  // case) — that field intentionally bypasses the client validator
  // because it's an authorization concern, not a client-data concern.
  const trainerId = await resolveTrainerId(user, body);

  const data = { trainerId };
  PERSISTED_CLIENT_FIELDS.forEach((field) => {
    if (value[field] !== undefined) data[field] = value[field];
  });

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
  // Partial validation — only fields present in the body are checked, but
  // every field present must still satisfy its rules.
  const result = validateClientPayload(body, { partial: true });
  if (!result.ok) {
    throw ApiError.validation(result.errors);
  }
  const value = result.value;

  const client = await getClientForTrainer(id, user).catch(async (err) => {
    if (user.role === "ADMIN") {
      if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid client id");
      const c = await Client.findById(id);
      if (!c) throw new ApiError(404, "Client not found");
      return c;
    }
    throw err;
  });

  // PATCH may touch any persisted onboarding field plus `status`.
  const PATCHABLE = [...PERSISTED_CLIENT_FIELDS, "status"];
  for (const k of PATCHABLE) {
    if (value[k] !== undefined) client[k] = value[k];
  }

  await client.save();
  return client;
}

module.exports = { createClient, listClientsForTrainer, getClientForTrainer, updateClient };
