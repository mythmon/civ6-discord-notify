const knexConfig = require("../knexfile.js");

function parseConfigMap(configEntry, fallback = []) {
  if (typeof configEntry != "string") {
    return fallback;
  }
  return configEntry
    .split(",")
    .map((keyAndVal) => keyAndVal.split("="))
    .map(([key, val]) => [key.trim(), val.trim()]);
}

module.exports = {
  secretKey: process.env.SECRET_KEY,
  turnToken: process.env.TURN_TOKEN,
  games: Object.fromEntries(
    parseConfigMap(process.env.GAMES_TO_WEBHOOKS).map(([game, webhookUrl]) => [
      game,
      { name: game, webhookUrl },
    ])
  ),
  players: Object.fromEntries(
    parseConfigMap(process.env.PLAYER_IDS).map(([playerName, discordId]) => [
      playerName,
      { civName: playerName, discordId },
    ])
  ),
  messageStyle: process.env.MESSAGE_STYLE || "plain", // embed, plain, or hybrid
  db: knexConfig,
  port: process.env.PORT || 3000,
  discordAuth: {
    clientID: process.env.DISCORD_AUTH_CLIENT_ID,
    clientSecret: process.env.DISCORD_AUTH_CLIENT_SECRET,
    callbackBase: process.env.DISCORD_AUTH_CALLBACK_BASE,
  },
};
