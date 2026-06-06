"use strict";

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { User } = require("../schemas/User.schema");
const { Client } = require("../schemas/Client.schema");
const ApiError = require("../utils/ApiError");

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildSafeUser(u) {
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
// Kept for back-compat — trainer endpoints already import this name.
const buildSafeTrainer = buildSafeUser;

/**
 * Count active admins, optionally excluding a specific id (used by the
 * disable / delete safety guards: "would this leave us with zero?").
 */
async function countActiveAdmins({ excludeId } = {}) {
  const query = { role: "ADMIN", isActive: true };
  if (excludeId) query._id = { $ne: excludeId };
  return User.countDocuments(query);
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

// ─── Admin management ─────────────────────────────────────────
// Mirrors the trainer surface but with three safety rules baked into the
// service layer (so any future caller — REST, CLI, batch — gets them):
//   1. Cannot disable own account.
//   2. Cannot disable the LAST active admin.
//   3. Cannot delete the LAST active admin.

async function listAdmins() {
  const admins = await User.find({ role: "ADMIN" }).sort({ createdAt: -1 });
  return admins.map(buildSafeUser);
}

async function createAdmin(body) {
  const errors = {};
  if (!body || typeof body !== "object") {
    throw ApiError.validation({ _root: "Body required" });
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
  const admin = await User.create({
    name,
    email,
    password: hashed,
    role:     "ADMIN",
    isActive: true,
  });

  return buildSafeUser(admin);
}

async function setAdminActive(currentUser, id, isActive) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid admin id");

  // Rule 1: cannot disable own account.
  if (!isActive && String(currentUser._id) === String(id)) {
    throw new ApiError(400, "You cannot disable your own account");
  }

  const target = await User.findOne({ _id: id, role: "ADMIN" });
  if (!target) throw new ApiError(404, "Admin not found");

  // Rule 2: cannot disable the LAST active admin. Check by counting other
  // active admins (i.e., active admins whose _id is not this one). If
  // we're disabling and there are zero others, refuse.
  if (!isActive && target.isActive) {
    const othersActive = await countActiveAdmins({ excludeId: id });
    if (othersActive === 0) {
      throw new ApiError(400, "Cannot disable the last active admin");
    }
  }

  target.isActive    = !!isActive;
  target.refreshToken = null; // force re-login on next access
  await target.save();
  return buildSafeUser(target);
}

async function deleteAdmin(currentUser, id) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid admin id");

  // Cannot delete own account either — same spirit as the disable rule and
  // closes an obvious foot-gun.
  if (String(currentUser._id) === String(id)) {
    throw new ApiError(400, "You cannot delete your own account");
  }

  const target = await User.findOne({ _id: id, role: "ADMIN" });
  if (!target) throw new ApiError(404, "Admin not found");

  // Rule 3: cannot delete the last active admin. If the target is active
  // and there is no other active admin, refuse. (Deleting an already-
  // inactive admin is always allowed.)
  if (target.isActive) {
    const othersActive = await countActiveAdmins({ excludeId: id });
    if (othersActive === 0) {
      throw new ApiError(400, "Cannot delete the last active admin");
    }
  }

  await User.deleteOne({ _id: id });
  return { _id: id, deleted: true };
}

module.exports = {
  listTrainers,
  createTrainer,
  setTrainerActive,
  getPlatformMetrics,
  // Admin management
  listAdmins,
  createAdmin,
  setAdminActive,
  deleteAdmin,
};
