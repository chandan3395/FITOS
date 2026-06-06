"use strict";

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { User } = require("../schemas/User.schema");
const { Client } = require("../schemas/Client.schema");
const ApiError = require("../utils/ApiError");

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildSafeTrainer(u) {
  return {
    _id:       u._id,
    name:      u.name,
    email:     u.email,
    role:      u.role,
    isActive:  u.isActive,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

/** GET /api/admin/trainers — list every TRAINER user with their client counts. */
async function listTrainers() {
  const trainers = await User.find({ role: "TRAINER" }).sort({ createdAt: -1 });

  // One aggregate query keeps this O(1) regardless of trainer count.
  const counts = await Client.aggregate([
    { $group: {
        _id: "$trainerId",
        total:  { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] } },
    } },
  ]);
  const byTrainer = new Map(counts.map((c) => [String(c._id), c]));

  return trainers.map((t) => {
    const c = byTrainer.get(String(t._id));
    return {
      ...buildSafeTrainer(t),
      activeClients: c?.active || 0,
      totalClients:  c?.total  || 0,
    };
  });
}

/** POST /api/admin/trainers — admin-created trainer with password. */
async function createTrainer(body) {
  const errors = {};
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { _root: "Body required" } };
  }
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = body.password;

  if (name.length < 2)            errors.name = "Name must be at least 2 characters.";
  if (!EMAIL_RX.test(email))      errors.email = "Enter a valid email address.";
  if (!password || typeof password !== "string" || password.length < 8)
    errors.password = "Password must be at least 8 characters.";

  if (Object.keys(errors).length) throw ApiError.validation(errors);

  if (await User.findOne({ email })) {
    throw new ApiError(409, "Email already in use");
  }

  const hashed = await bcrypt.hash(password, 12);
  const trainer = await User.create({
    name,
    email,
    password: hashed,
    role:     "TRAINER",
    isActive: true,
  });

  return buildSafeTrainer(trainer);
}

async function setTrainerActive(id, isActive) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid trainer id");
  const trainer = await User.findOneAndUpdate(
    { _id: id, role: "TRAINER" },
    { $set: { isActive: !!isActive, refreshToken: null } }, // also invalidate refresh
    { new: true }
  );
  if (!trainer) throw new ApiError(404, "Trainer not found");
  return buildSafeTrainer(trainer);
}

/** GET /api/admin/metrics — platform-level analytics. */
async function getPlatformMetrics() {
  const [totalTrainers, activeTrainers, totalClients] = await Promise.all([
    User.countDocuments({ role: "TRAINER" }),
    User.countDocuments({ role: "TRAINER", isActive: true }),
    Client.countDocuments({}),
  ]);
  return {
    totalTrainers,
    activeTrainers,
    inactiveTrainers: totalTrainers - activeTrainers,
    totalClients,
  };
}

module.exports = {
  listTrainers,
  createTrainer,
  setTrainerActive,
  getPlatformMetrics,
};
