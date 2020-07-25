const path = require("path");

const cors = require("cors");
const express = require("express");
const fallback = require("express-history-api-fallback");
const csvStringify = require("csv-stringify");

const config = require("./config.js");
const { getDb } = require("./db.js");
const { sendTurnNotification } = require("./discord.js");

const root = path.resolve(__dirname + "/../public");

// preload database
getDb();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(root));

app.use("/fa", (request, response) => {
  const requestPath = path.normalize(request.path.slice(1));
  if (requestPath.includes("..")) {
    response.status(400);
    response.json({ error: "Path traversal blocked" });
    return;
  }
  const faPath = require.resolve("@fortawesome/fontawesome-free");
  const filePath = path.normalize(path.join(faPath, "../..", requestPath));
  response.sendFile(filePath);
});

app.post("/api/turn/:secretKey", async (request, response) => {
  const { secretKey } = request.params;
  let {
    Value1: gameName,
    Value2: playerCivName,
    Value3: turnNumber,
    silent = false,
  } = request.body;

  if (typeof silent == "string") {
    silent = !!JSON.parse(silent);
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

  const db = await getDb();
  const gameMoves = db("moves").where({ gameName });

  if (gameMoves.length == 0 && !config.games[gameName]) {
    response.status(404);
    response.json({ error: `Unknown game "${gameName}"` });
    return;
  }

  // The previous turn should be complete

  const lastNotification = await gameMoves.clone().orderBy("receivedAt", "desc").first("*");
  const playerCount = (await gameMoves.clone().distinct("playerCivName").pluck("playerCivName"))
    .length;

  let players = null;
  let tryTurn = lastNotification.turnNumber - 1;
  while (!players && tryTurn >= 1) {
    let turnPlayers = await gameMoves
      .clone()
      .where({ turnNumber: tryTurn })
      .orderBy("receivedAt", "ascending")
      .pluck("playerCivName");

    if (turnPlayers.length == playerCount) {
      players = turnPlayers;
      break;
    } else {
      tryTurn -= 1;
    }
  }

  // No turns were complete? Guess arbitrarily.
  if (!players) {
    console.log("no turn was complete, weird");
    players = await gameMoves.clone().distinct("playerCivName").pluck("playerCivName");
  }

  response.json({
    name: gameName,
    players,
    turnNumber: lastNotification.turnNumber,
    currentPlayer: lastNotification.playerCivName,
    lastUpdated: new Date(lastNotification.receivedAt).toISOString(),
  });
});

app.get("/api/game/:gameName/history.:ext?", async (request, response) => {
  const { gameName, ext } = request.params;

  const game = config.games[gameName];
  if (!game) {
    response.status(404);
    response.json({ error: `Unknown game "${gameName}"` });
    return;
  }

  const db = await getDb();
  const moves = await db.select("*").from("moves").where({ gameName });

  for (const move of moves) {
    let d = new Date(move.receivedAt);
    move.receivedAt = d.toISOString();
  }

  if (ext == null || ext == "json") {
    response.json({
      name: gameName,
      turnNotifications: moves,
    });
  } else if (ext == "csv") {
    csvStringify(moves, { header: true }).pipe(response);
  } else {
    response.status(400);
    response.send(`Unknown extension ${ext}`);
  }
});

app.use(fallback("index.html", { root }));

// listen for requests :)
const listener = app.listen(config.port, () => {
  console.log("Your app is listening on port " + listener.address().port, new Date());
});
