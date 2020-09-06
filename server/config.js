const knexConfig = require("../knexfile.js");

const config = {
  debug: JSON.parse(process.env.DEBUG || "false"),
  secretKey: process.env.SECRET_KEY,
  turnToken: process.env.TURN_TOKEN,
  messageStyle: process.env.MESSAGE_STYLE || "plain", // embed, plain, or hybrid
  db: knexConfig,
  port: process.env.PORT || 3000,
  discordAuth: {
    clientID: process.env.DISCORD_AUTH_CLIENT_ID,
    clientSecret: process.env.DISCORD_AUTH_CLIENT_SECRET,
    callbackBase: process.env.DISCORD_AUTH_CALLBACK_BASE,
  },
  projectDomain: null,
};

if (process.env.PROJECT_DOMAIN) {
  const projectDomain = process.env.PROJECT_DOMAIN;
  if (projectDomain.startsWith("http")) {
    config.projectDomain = projectDomain;
  } else {
    config.projectDomain = `https://${projectDomain}.glitch.me`;
  }
}

if (config.debug) {
  console.log("CONFIG", JSON.stringify(config, null, 2));
}

module.exports = config;
