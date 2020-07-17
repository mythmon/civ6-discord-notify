const express = require("express");
const app = express();

const config = {
  secretKey
  games: {},
  players: {}
};

function parseConfigMap(configEntry) {
  return configEntry
    .split(",")
    .map(keyAndVal => keyAndVal.split("="))
    .map(([key, val]) => [key.trim(), val.trim()]);
}

config.games = Object.fromEntries(
  parseConfigMap(process.env.GAMES_TO_WEBHOOKS).map(([game, webhookUrl]) => [
    game,
    { webhookUrl }
  ])
);

config.players = Object.fromEntries(
  parseConfigMap(process.env.PLAYER_IDS).map(([playerName, discordId]) => [
    playerName,
    { discordId }
  ])
);

console.log(JSON.stringify(config, null, 4));

// make all the files in 'public' available
// https://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

// https://expressjs.com/en/starter/basic-routing.html
app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/index.html");
});

// send the default array of dreams to the webpage
app.get("/dreams", (request, response) => {
  // express helps us take JS objects and send them as JSON
  response.json(dreams);
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
