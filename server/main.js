const path = require("path");

const express = require("express");
const fallback = require("express-history-api-fallback");
const fetch = require("node-fetch");

const config = require("./config.js");
const { getDb } = require("./db.js");
const { sendTurnNotification } = require("./discord.js");

const root = __dirname + "/public";

const app = express();

app.use(express.json());
app.use(express.static(root));

// preload database
getDb();

app.post("/api/turn/:secretKey", async (request, response) => {
  const { secretKey } = request.params;
  const {
    Value1: gameName,
    Value2: playerCivName,
    Value3: turnNumber,
    silent = false,
    receivedAt = null,
  } = request.body;

  if (typeof silent == 'string') {
    silent = !!JSON.parse(string);
  }

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

  const db = await getDb();
  await db("moves").insert({ playerCivName, gameName, turnNumber });

  if (!silent) {
    sendTurnNotification({ player, game, turnNumber });
  }

  response.status(202);
  response.send();
});

app.get("/api/game", async (request, response) => {
  const db = await getDb();
  const games = await db("moves").distinct("gameName");

  response.json(games);
});

app.get("/api/game/:gameName", async (request, response) => {
  const { gameName } = request.params;

  const game = config.games[gameName];
  if (!game) {
    response.status(404);
    response.json({ error: `Unknown game "${gameName}"` });
    return;
  }

  const db = await getDb();
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
    lastUpdated: new Date(lastNotification.receivedAt).toISOString(),
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

  const db = await getDb();
  const moves = await db.select("*").from("moves").where({ gameName });
  response.json({
    name: gameName,
    turnNotifications: moves,
  });
});

app.use(fallback("index.html", { root }));

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
