const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const configurePassport = () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true
      },
      async (_req, _accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          const googleId = profile.id;

          if (!email) {
            return done(new Error('Google account has no email'));
          }

          let user = await User.findOne({ googleId });
          if (user) {
            if (!user.emailVerified) {
              user.emailVerified = true;
              await User.saveWithUniqueStudentId(user);
            }
            return done(null, user);
          }

          user = await User.findOne({ email });
          if (user) {
            user.googleId = googleId;
            user.provider = user.provider === 'local' ? 'both' : user.provider;
            if (!user.emailVerified) {
              user.emailVerified = true;
            }
            await User.saveWithUniqueStudentId(user);
            return done(null, user);
          }

          const fullName = profile.displayName || profile.name?.givenName || 'Google User';

          user = await User.createWithUniqueStudentId({
            email,
            fullName,
            googleId,
            provider: 'google',
            emailVerified: true
          });

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
};

module.exports = { configurePassport };
