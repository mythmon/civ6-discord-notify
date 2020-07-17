const express = require("express");
const app = express();

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

app.post("/api/turn/:key", (request, response) => {
  console.log(response.params, response.json());
  response.status(201);
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
