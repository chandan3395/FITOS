"use strict";

const mongoose = require("mongoose");
const { Client } = require("../schemas/Client.schema");
const ApiError = require("../utils/ApiError");
const cloudinary = require("../config/cloudinary");

const { MEAL_TYPES } = require("../schemas/nutritionSchedule.subschema");

const SLOTS = ["front", "side", "back"];
const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snack"];
const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;

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

/**
 * POST /api/uploads/sign-meal
 * Signs one meal-photo slot upload — (client, date, meal). Same access rules
 * as meal-checkin writes: CLIENT signs for self; TRAINER/ADMIN pass clientId.
 */
async function signMealPhoto(user, body) {
  let client;
  if (user.role === "CLIENT") {
    client = await resolveCurrentClient(user);
  } else {
    client = await assertClientAccess(body.clientId, user);
  }

  const date = String(body.date || "");
  if (!DATE_RX.test(date)) throw new ApiError(400, "date (YYYY-MM-DD) is required");

  const meal = String(body.meal || body.slot || "").toLowerCase();
  if (!MEAL_SLOTS.includes(meal)) {
    throw new ApiError(400, `meal must be one of: ${MEAL_SLOTS.join(", ")}`);
  }

  return cloudinary.signMealUpload({ clientId: client._id, date, meal });
}

/**
 * POST /api/uploads/sign-meal-log
 * Signs one meal-LOG photo upload — (client, date, mealType) — for the
 * Nutrition v2 structured-plan logging flow. Distinct Cloudinary folder from
 * meal check-ins. Same access rules: CLIENT signs for self; TRAINER/ADMIN
 * pass an explicit clientId.
 */
async function signMealLog(user, body) {
  let client;
  if (user.role === "CLIENT") {
    client = await resolveCurrentClient(user);
  } else {
    client = await assertClientAccess(body.clientId, user);
  }

  const date = String(body.date || "");
  if (!DATE_RX.test(date)) throw new ApiError(400, "date (YYYY-MM-DD) is required");

  const raw = String(body.mealType || "").trim().toLowerCase();
  const canonical = MEAL_TYPES.find((m) => m.toLowerCase() === raw);
  if (!canonical) {
    throw new ApiError(400, `mealType must be one of: ${MEAL_TYPES.join(", ")}`);
  }

  return cloudinary.signMealLogUpload({
    clientId: client._id,
    date,
    mealType: canonical.toLowerCase(),
  });
}

module.exports = { signProgressPhoto, signMealPhoto, signMealLog, SLOTS, MEAL_SLOTS };
