const path = require("path");

const passportDiscord = require("passport-discord");
const passport = require("passport");
const session = require("express-session");
const KnexSessionStore = require("connect-session-knex")(session);

const db = require("./db.js");
const config = require("./config.js");

const store = new KnexSessionStore({ knex: db.getDbSync() });

function makeAuthStrategy() {
  return new passportDiscord.Strategy(
    {
      clientID: config.discordAuth.clientID,
      clientSecret: config.discordAuth.clientSecret,
      callbackURL: config.discordAuth.callbackBase + "/auth/discord/callback",
      scope: ["identify", "guilds"],
    },
    (accessToken, refreshToken, profile, done) => {
      done(null, profile);
    }
  );
}

module.exports.setup = (app) => {
  passport.use(makeAuthStrategy());

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  app.use(session({ secret: config.secretKey, store, saveUninitialized: false, resave: false }));
  app.use(passport.initialize());
  app.use(passport.session());

  app.get("/auth/discord", passport.authenticate("discord"));

  app.get(
    "/auth/discord/callback",
    passport.authenticate("discord", {
      successRedirect: "/auth/result?success",
      failureRedirect: "/auth/result?failure",
    })
  );

  app.get("/auth/logout", (req, res) => {
    req.logout();
    res.redirect("/");
  });

  app.get("/auth/result", (req, res) => {
    const filePath = path.resolve(__dirname + "/../public/authCallback.html");
    res.sendFile(filePath);
  });
};
