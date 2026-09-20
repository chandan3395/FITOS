"use strict";
// Opaque, high-entropy state: all intent lives server-side. Atomic consumption
// prevents replay across processes; TTL cleanup is not used as expiry validation.
const crypto = require("crypto");
const mongoose = require("mongoose");
const { env } = require("../config/env");
const schema = new mongoose.Schema({
  digest: { type: String, unique: true, required: true },
  browserDigest: { type: String, required: true },
  intent: { type: String, enum: ["BYOT", "TRAINER", "CLIENT"], required: true },
  invite: String,
  platform: String,
  expiresAt: { type: Date, expires: 0, required: true },
});
const OAuthState = mongoose.model("OAuthState", schema);
const COOKIE = "fitosOAuthBrowser";
const options = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/auth",
  maxAge: 10 * 60 * 1000,
};
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
async function begin(req, res) {
  const state = crypto.randomBytes(32).toString("hex");
  const browser = crypto.randomBytes(32).toString("hex");
  const invite =
    typeof req.query.invite === "string" && req.query.invite.length <= 512
      ? req.query.invite
      : undefined;
  const intent = invite
    ? "CLIENT"
    : req.query.intent === "byot"
      ? "BYOT"
      : req.query.role === "TRAINER"
        ? "TRAINER"
        : "CLIENT";
  await OAuthState.create({
    digest: hash(state),
    browserDigest: hash(browser),
    intent,
    invite,
    platform: intent !== "BYOT" && req.query.platform === "mobile" ? "mobile" : "web",
    expiresAt: new Date(Date.now() + options.maxAge),
  });
  res.cookie(COOKIE, browser, options);
  return state;
}
async function consume(req) {
  const state = req.query.state;
  const browser = req.cookies?.[COOKIE];
  if (typeof state !== "string" || !/^[a-f0-9]{64}$/.test(state) || typeof browser !== "string")
    return null;
  return OAuthState.findOneAndDelete({
    digest: hash(state),
    browserDigest: hash(browser),
    expiresAt: { $gt: new Date() },
  });
}
module.exports = { begin, consume, OAuthState, COOKIE, options };
