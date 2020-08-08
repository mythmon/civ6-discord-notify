const knexConfig = require("../knexfile.js");

module.exports = {
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
};
