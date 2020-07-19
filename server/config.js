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
};
