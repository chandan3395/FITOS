"use strict";

const mongoose = require("mongoose");
const { Client } = require("../schemas/Client.schema");
const ApiError = require("./ApiError");

/**
 * Shared client-access / authorization helpers.
 *
 * Extracted verbatim (behaviour-preserving) from the per-service copies that
 * previously lived in checkin / mealCheckin / progressPhoto / workoutPlan /
 * nutritionPlan services. The three historical variants are unified here via
 * options so each caller keeps its EXACT prior semantics:
 *
 *   - allowAdmin / allowClient — whether ADMIN and the owning CLIENT may pass
 *     (the checkin/meal/progress variant allowed both unconditionally; the
 *     workout/nutrition variant gated them per call).
 *   - excludeDeleted — whether a soft-deleted client is treated as 404
 *     (workoutPlan filtered soft-deleted; the others did not).
 *
 * A TRAINER always passes iff they own the client; otherwise 403.
 */

function assertObjectId(id, label = "id") {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
}

function assertTrainer(user) {
  if (user.role !== "TRAINER") {
    throw new ApiError(403, "Forbidden");
  }
}

/**
 * Resolve + authorize a client by id for the given user.
 *
 * @param {Object} user                  the authenticated user
 * @param {string} clientId              target client id
 * @param {Object} [opts]
 * @param {boolean} [opts.allowAdmin]    ADMIN may access any client
 * @param {boolean} [opts.allowClient]   the owning CLIENT may access their own
 * @param {boolean} [opts.excludeDeleted] treat soft-deleted clients as 404
 * @returns {Promise<Object>} the Client document
 */
async function resolveClientForUser(
  user,
  clientId,
  { allowAdmin = false, allowClient = false, excludeDeleted = false } = {}
) {
  assertObjectId(clientId, "clientId");

  const client = await Client.findById(clientId);
  if (!client || (excludeDeleted && client.isDeleted)) {
    throw new ApiError(404, "Client not found");
  }

  if (user.role === "TRAINER") {
    if (String(client.trainerId) !== String(user._id)) {
      throw new ApiError(403, "Forbidden");
    }
    return client;
  }
  if (allowAdmin && user.role === "ADMIN") return client;
  if (allowClient && user.role === "CLIENT" && String(client.userId) === String(user._id)) return client;

  throw new ApiError(403, "Forbidden");
}

/**
 * Convenience wrapper matching the checkin / mealCheckin / progressPhoto
 * variant: ADMIN and the owning CLIENT are always permitted, and soft-deleted
 * clients are NOT filtered. Signature kept as (clientId, user) so existing
 * call sites in those services are unchanged.
 */
function assertClientAccess(clientId, user) {
  return resolveClientForUser(user, clientId, {
    allowAdmin: true,
    allowClient: true,
    excludeDeleted: false,
  });
}

/**
 * Resolve the Client owned by the signed-in CLIENT user (their own profile).
 * @param {Object} user
 * @param {Object} [opts]
 * @param {boolean} [opts.excludeDeleted] only match non-deleted clients
 */
async function resolveCurrentClient(user, { excludeDeleted = false } = {}) {
  if (user.role !== "CLIENT") {
    throw new ApiError(403, "Forbidden");
  }
  const query = { userId: user._id };
  if (excludeDeleted) query.isDeleted = { $ne: true };

  const client = await Client.findOne(query);
  if (!client) {
    throw new ApiError(404, "Client record not found");
  }
  return client;
}

module.exports = {
  assertObjectId,
  assertTrainer,
  resolveClientForUser,
  assertClientAccess,
  resolveCurrentClient,
};
