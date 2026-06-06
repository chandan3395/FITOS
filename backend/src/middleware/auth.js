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
  // Prefer the header (sent by axios on every API call) but fall back to
  // a cookie so direct browser hits / curl / image src etc. still work.
  const headerRole   = req.headers["x-dev-role"];
  const headerClient = req.headers["x-dev-client-id"];
  const cookieRole   = req.cookies?.dev_role;
  const cookieClient = req.cookies?.dev_client_id;

  const rawRole = String(headerRole || cookieRole || "").toUpperCase();
  const role    = VALID_DEV_ROLES.includes(rawRole) ? rawRole : "ADMIN";
  const clientId = headerClient || cookieClient || null;

  // eslint-disable-next-line no-console
  console.log("[dev-bypass] resolve", {
    path: req.path,
    headerRole, cookieRole, headerClient, cookieClient,
    role, clientId,
  });

  // CLIENT impersonation — resolve the linked User via the Client doc;
  // auto-create + link a synthetic User on first impersonation so
  // subsequent requests behave like a real activated client.
  if (role === "CLIENT" && clientId && mongoose.isValidObjectId(clientId)) {
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
        // eslint-disable-next-line no-console
        console.log("[dev-bypass] auto-linked client", { clientId, userId: String(u._id), name: u.name });
        return u;
      }
      const cu = await User.findById(client.userId);
      if (cu) {
        // eslint-disable-next-line no-console
        console.log("[dev-bypass] impersonating", { clientId, userId: String(cu._id), name: cu.name });
        return cu;
      }
    }
  }

  // ADMIN / TRAINER / generic CLIENT — stable per-role dev User.
  if (devUserCache.has(role)) {
    const cached = devUserCache.get(role);
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
      // eslint-disable-next-line no-console
      console.log("[dev-bypass] req.user ->", { name: req.user.name, role: req.user.role, _id: String(req.user._id) });
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
