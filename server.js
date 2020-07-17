const express = require("express");
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
  )
};

// make all the files in 'public' available
// https://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/index.html");
});

app.post("/api/turn/:secretKey", (request, response) => {
  const { secretKey } = request.params;
  const {
    value1: gameName,
    value2: playerCivName,
    value3: turnNumber
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
  const playerObj = config.players[playerCivName];
  if (playerObj && playerObj.discordId) {
    playerMention = `<@${playerObj.discordId`
  }

  const message = `It's ${playerCivName}'s move on turn ${turnNumber} of ${gameName}.`;
  console.log(message);

  response.status(202);
  response.json({ message });
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
