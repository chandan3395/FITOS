"use strict";

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { env } = require("../config/env");
const { User } = require("../schemas/User.schema");
const { Client } = require("../schemas/Client.schema");
const ApiError = require("../utils/ApiError");

const VALID_DEV_ROLES = ["ADMIN", "TRAINER", "CLIENT"];

// Cache the auto-provisioned dev User per role so we don't hit Mongo on
// every request. Keyed by role; value is the Mongoose User doc.
const devUserCache = new Map();

async function resolveDevUser(req) {
  const headerRole = String(req.headers["x-dev-role"] || "").toUpperCase();
  const role = VALID_DEV_ROLES.includes(headerRole) ? headerRole : "ADMIN";

  // CLIENT impersonation — the trainer is verifying what a specific client
  // sees. Resolve the linked User via the Client doc; if the client has
  // not activated yet, auto-create a synthetic User and link it so
  // subsequent requests behave like a real activated client.
  if (role === "CLIENT") {
    const clientId = req.headers["x-dev-client-id"];
    if (clientId && mongoose.isValidObjectId(clientId)) {
      const client = await Client.findById(clientId);
      if (client) {
        if (!client.userId) {
          const u = await User.create({
            name:  client.name,
            email: client.email || `dev-client-${client._id}@fitos.local`,
            role:  "CLIENT",
          });
          client.userId = u._id;
          await client.save();
          return u;
        }
        const cu = await User.findById(client.userId);
        if (cu) return cu;
      }
    }
  }

  // ADMIN / TRAINER / generic CLIENT — stable per-role dev User.
  if (devUserCache.has(role)) {
    const cached = devUserCache.get(role);
    // Verify still in DB (Atlas could have been wiped between restarts).
    const fresh = await User.findById(cached._id);
    if (fresh) return fresh;
    devUserCache.delete(role);
  }

  const email = `dev-${role.toLowerCase()}@fitos.local`;
  let u = await User.findOne({ email });
  if (!u) {
    u = await User.create({
      name:  `Dev ${role.charAt(0)}${role.slice(1).toLowerCase()}`,
      email,
      role,
    });
  } else if (u.role !== role) {
    u.role = role;
    await u.save();
  }
  devUserCache.set(role, u);
  return u;
}

async function authenticate(req, _res, next) {
  if (process.env.DEV_AUTH_BYPASS === "true") {
    try {
      req.user = await resolveDevUser(req);
      return next();
    } catch (e) {
      return next(new ApiError(500, `Dev bypass error: ${e.message}`));
    }
  }

  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new ApiError(401, "No token provided");
    }

    const token = header.slice(7);
    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw new ApiError(401, "Unauthorized");
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(new ApiError(401, "Invalid or expired token"));
  }
}

module.exports = authenticate;
