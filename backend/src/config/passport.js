"use strict";

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { User } = require("../schemas/User.schema");
const { env } = require("./env");

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, _accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("No email from Google"), null);

        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.findOne({ email });
        }

        if (user) {
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
          return done(null, user);
        }

        // Recover role from OAuth state parameter (base64-encoded JSON).
        let role = "CLIENT";
        try {
          const state = JSON.parse(Buffer.from(req.query.state, "base64").toString("utf8"));
          if (state.role === "TRAINER" || state.role === "CLIENT") role = state.role;
        } catch {
          // malformed state — fall back to CLIENT
        }

        user = await User.create({
          name: profile.displayName,
          email,
          googleId: profile.id,
          profileImage: profile.photos?.[0]?.value,
          role,
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = passport;
