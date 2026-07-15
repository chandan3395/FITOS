"use strict";

/**
 * Shared helpers for the integration suites. NOT a test file (no `.test.js`
 * suffix) so Jest never executes it directly.
 *
 * Every integration file spins up its OWN in-memory Mongo + its own fresh
 * `require("../../src/app")` (Jest sandboxes the module registry per file), so
 * the auth rate-limiter and DB state are isolated between files.
 */

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { User } = require("../../src/schemas/User.schema");
const { Client } = require("../../src/schemas/Client.schema");
const generateAccessToken = require("../../src/utils/generateAccessToken");

async function startMemoryMongo() {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  return mongod;
}

async function stopMemoryMongo(mongod) {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

const tokenFor = (user) => generateAccessToken(user._id, user.role);

// Unique email per created user so the User.email unique index never collides
// across a suite that seeds many actors.
const uniqEmail = (prefix) => `${prefix}_${new mongoose.Types.ObjectId()}@test.local`;

async function makeTrainer(overrides = {}) {
  return User.create({
    name: "Trainer",
    email: uniqEmail("trainer"),
    role: "TRAINER",
    isActive: true,
    ...overrides,
  });
}

async function makeAdmin(overrides = {}) {
  return User.create({
    name: "Admin",
    email: uniqEmail("admin"),
    role: "ADMIN",
    isActive: true,
    ...overrides,
  });
}

/**
 * Create a CLIENT User + its linked Client profile (userId wired), owned by
 * `trainer`. Returns { user, client, token }.
 */
async function makeClient(trainer, { clientOverrides = {}, userOverrides = {} } = {}) {
  const user = await User.create({
    name: "Client",
    email: uniqEmail("client"),
    role: "CLIENT",
    isActive: true,
    ...userOverrides,
  });
  const client = await Client.create({
    trainerId: trainer._id,
    name: "Client Profile",
    userId: user._id,
    status: "ACTIVE",
    ...clientOverrides,
  });
  return { user, client, token: tokenFor(user) };
}

module.exports = {
  startMemoryMongo,
  stopMemoryMongo,
  tokenFor,
  uniqEmail,
  makeTrainer,
  makeAdmin,
  makeClient,
};
