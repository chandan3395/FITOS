"use strict";

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { env } = require("./env");

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true,
    },
    require("../services/googleIdentity.service")
  )
);

module.exports = passport;
