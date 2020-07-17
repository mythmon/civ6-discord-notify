const express = require("express");
const fetch = require("node-fetch");
const knex = require("knex");
const fallback = require("express-history-api-fallback");

const knexConfig = require("./knexfile");

function parseConfigMap(configEntry) {
  return configEntry
    .split(",")
    .map(keyAndVal => keyAndVal.split("="))
    .map(([key, val]) => [key.trim(), val.trim()]);
}

const config = {
  secretKey: process.env.SECRET_KEY,
  games: Object.fromEntries(
    parseConfigMap(process.env.GAMES_TO_WEBHOOKS).map(([game, webhookUrl]) => [
      game,
      { name: game, webhookUrl }
    ])
  ),
  players: Object.fromEntries(
    parseConfigMap(process.env.PLAYER_IDS).map(([playerName, discordId]) => [
      playerName,
      { civName: playerName, discordId }
    ])
  ),
  messageStyle: process.env.MESSAGE_STYLE || "plain", // embed, plain, or hybrid
  db: knexConfig
};

const db = knex(config.db);

const app = express();

app.use(express.json());

const root = __dirname + '/public';
app.use(express.static(root));
app.use(fallback("index.html", { root }));

app.post("/api/turn/:secretKey", async (request, response) => {
  const { secretKey } = request.params;
  const {
    Value1: gameName,
    Value2: playerCivName,
    Value3: turnNumber
  } = request.body;

  if (secretKey !== config.secretKey) {
    console.warn("bad secret", secretKey);
    response.status(403);
    response.json({ error: "bad secret" });
    return;
  }

  const game = config.games[gameName];
  if (!game) {
    response.status(404);
    response.json({ error: `Unknown game ${gameName}` });
    return;
  }

  const player = config.players[playerCivName] || { civName: playerCivName };

  await db("moves").insert({ playerCivName, gameName, turnNumber });
  sendTurnNotification({ player, game, turnNumber });

  response.status(202);
  response.send();
});

async function sendTurnNotification({ player, game, turnNumber }) {
  let playerMention = player.civName;
  let allowed_mentions = {};
  const playerObj = config.players[player.civName];
  if (playerObj && playerObj.discordId) {
    playerMention = `<@${playerObj.discordId}>`;
    allowed_mentions.users = [playerObj.discordId];
  }

  const discordPayload = {
    username: "Civilization VI",
    avatar_url:
      "https://cdn.glitch.com/72884494-98c1-49e5-a144-3cc3e5f2a6a3%2Fciv6%20icon.jpg?v=1594946929396",
    allowed_mentions
  };

  switch (config.messageStyle) {
    case "embed": {
      discordPayload.embeds = [
        {
          title: game.name,
          color: 0x05d458,
          description: `It's ${playerMention}'s move on turn ${turnNumber}`
        }
      ];
      break;
    }

    case "plain": {
      discordPayload.content = `It's ${playerMention}'s move on ${game.name} turn ${turnNumber}`;
      break;
    }

    case "hybrid": {
      discordPayload.content = `It's ${playerMention}'s move`;
      discordPayload.embeds = [
        {
          title: game.name,
          color: 0x05d458,
          description: `Turn ${turnNumber}`
        }
      ];
      break;
    }

    default: {
      res.status(500);
      res.send();
      throw new Error(`Unknown messageStyle ${config.messageStyle}`);
    }
  }

  const url = new URL(game.webhookUrl);
  url.searchParams.set("wait", true);
  console.log("POST", url.toString());
  const res = await fetch(url, {
    method: "post",
    body: JSON.stringify(discordPayload),
    headers: { "Content-Type": "application/json" }
  });
}

app.get("/api/game", async (request, response) => {
  const gameNames = await db("moves")
    .distinct("gameName")
    .pluck("gameName");

  response.json({
    names: gameNames
  });
});

app.get("/api/game/:gameName", async (request, response) => {
  const { gameName } = request.params;

  const game = config.games[gameName];
  if (!game) {
    response.status(404);
    response.json({ error: `Unknown game "${gameName}"` });
    return;
  }

  const gameMoves = db("moves")
    .where({ gameName })
    .orderBy("receivedAt", "desc");

  const lastNotification = await gameMoves.clone().first("*");
  const players = await gameMoves
    .clone()
    .distinct("playerCivName")
    .pluck("playerCivName");

  response.json({
    name: gameName,
    players,
    turnNumber: lastNotification.turnNumber,
    currentPlayer: lastNotification.playerCivName,
    lastUpdated: lastNotification.receivedAt
  });
});

app.get("/api/game/:gameName/history", async (request, response) => {
  const { gameName } = request.params;

  const game = config.games[gameName];
  if (!game) {
    response.status(404);
    response.json({ error: `Unknown game "${gameName}"` });
    return;
  }

  const moves = await db
    .select("*")
    .from("moves")
    .where({ gameName });
  response.json({
    name: gameName,
    turnNotifications: moves
  });
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
