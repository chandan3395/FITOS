"use strict";

const mongoose = require("mongoose");
const { Client } = require("../schemas/Client.schema");
const { User } = require("../schemas/User.schema");
const ApiError = require("../utils/ApiError");

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

  const client = await Client.create(data);
  return client;
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

module.exports = { createClient, listClientsForTrainer, getClientForTrainer };
