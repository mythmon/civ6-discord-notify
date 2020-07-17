const express = require("express");
const fetch = require("node-fetch");

const app = express();

app.use(express.json());

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
      { webhookUrl }
    ])
  ),
  players: Object.fromEntries(
    parseConfigMap(process.env.PLAYER_IDS).map(([playerName, discordId]) => [
      playerName,
      { discordId }
    ])
  ),
  messageStyle: 'embed', // embed, plain, or hybrid
};

// make all the files in 'public' available
// https://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/index.html");
});

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

  const gameObj = config.games[gameName];
  if (!gameObj) {
    response.status(404);
    response.json({ error: `Unknown game ${gameName}` });
    return;
  }

  let playerMention = playerCivName;
  let allowed_mentions = {};
  const playerObj = config.players[playerCivName];
  if (playerObj && playerObj.discordId) {
    playerMention = `<@${playerObj.discordId}>`;
    allowed_mentions.users = [playerObj.discordId];
  }

  const discordPayload = {
    username: "Civilization VI",
    avatar_url:
      "https://cdn.glitch.com/72884494-98c1-49e5-a144-3cc3e5f2a6a3%2Fciv6%20icon.jpg?v=1594946929396",
    allowed_mentions
    embeds: [
      {
        title: gameName,
        color: 0x05d458,
        description: `It's ${playerMention}'s move on turn ${turnNumber}`
      }
    ],
    allowed_mentions
  };

  const url = new URL(gameObj.webhookUrl);
  url.searchParams.set("wait", true);
  console.log("POST", url.toString());
  const res = await fetch(url, {
    method: "post",
    body: JSON.stringify(discordPayload),
    headers: { "Content-Type": "application/json" }
  });

  console.log(await res.json());

  response.status(202);
  response.send();
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
