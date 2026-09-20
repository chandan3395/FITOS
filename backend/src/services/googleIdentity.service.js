"use strict";
const { User } = require("../schemas/User.schema");
const { Client } = require("../schemas/Client.schema");
async function googleIdentity(req, _accessToken, _refreshToken, profile, done, retried = false) {
  try {
    if (!req.oauthState || !["BYOT", "TRAINER", "CLIENT"].includes(req.oauthState.intent))
      return done(new Error("Invalid OAuth state"));
    const email = profile.emails?.[0]?.value?.trim().toLowerCase();
    if (!email || profile._json?.email_verified !== true)
      return done(new Error("Google email must be verified"), null);

    let user = await User.findOne({ googleId: profile.id });

    if (!user) {
      user = await User.findOne({ email });
    }

    if (user) {
      if (
        (req.oauthState.intent === "BYOT" && user.role !== "BYOT") ||
        (req.oauthState.intent !== "BYOT" && user.role === "BYOT")
      )
        return done(null, false, { code: "account_conflict" });
      if (!user.isActive) return done(null, user);
      if (user.googleId && user.googleId !== profile.id)
        return done(null, false, { code: "account_conflict" });
      // Admins must use email + password only — never attach Google to
      // an admin account or let it authenticate via OAuth.
      if (user.role === "ADMIN") {
        return done(null, false, { message: "Admins must sign in with email and password" });
      }
      // Link Google to the existing TRAINER/CLIENT account (same email,
      // existing role wins — no duplicate is created).
      if (!user.googleId) {
        user.googleId = profile.id;
        user.googleLinked = true;
        await user.save();
      } else if (!user.googleLinked) {
        user.googleLinked = true;
        await user.save();
      }
      return done(null, user);
    }

    if (
      req.oauthState.intent === "BYOT" &&
      (await Client.exists({ email, isDeleted: { $ne: true } }))
    )
      return done(null, false, { code: "account_conflict" });
    const role = req.oauthState.intent;

    user = await User.create({
      name: profile.displayName,
      email,
      googleId: profile.id,
      googleLinked: true,
      profileImage: profile.photos?.[0]?.value,
      role,
    });

    return done(null, user);
  } catch (err) {
    if (err.code === 11000 && !retried)
      return googleIdentity(req, _accessToken, _refreshToken, profile, done, true);
    return done(err, null);
  }
}
module.exports = googleIdentity;
