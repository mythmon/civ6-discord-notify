const path = require("path");

const cors = require("cors");
const express = require("express");
const fallback = require("express-history-api-fallback");
const csvStringify = require("csv-stringify");

const config = require("./config.js");
const { getDb } = require("./db.js");
const { sendTurnNotification } = require("./discord.js");
const auth = require("./auth.js");

const root = path.resolve(__dirname + "/../public");

// preload database
getDb();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(root));

auth.setup(app);

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

app.get("/api/whoami", (req, res) => {
  res.json({ user: req.user || null });
});

app.post("/api/turn/:turnToken", async (request, response) => {
  const { turnToken } = request.params;
  let {
    Value1: gameName,
    Value2: civilizationUserName,
    Value3: turnNumber,
    silent = false,
  } = request.body;

  if (typeof silent == "string") {
    silent = !!JSON.parse(silent);
  }

  if (turnToken !== config.turnToken) {
    console.warn("bad turn token", turnToken);
    response.status(403);
    response.json({ error: "bad turn token" });
    return;
  }

  const game = config.games[gameName];
  if (!game) {
    response.status(404);
    response.json({ error: `Unknown game ${gameName}` });
    return;
  }

  const db = await getDb();
  const user = await db("users").where({ civilizationUserName }).first();
  await db("moves").insert({ userId: user.id, gameName, turnNumber });

  response.status(202);
  response.send();

  if (!silent) {
    try {
      await sendTurnNotification({ user, game, turnNumber });
    } catch (err) {
      console.error("Could not send Discord notification", err.toString());
    }
  }
});

app.get("/api/game", async (request, response) => {
  const db = await getDb();
  const games = await db("moves").distinct("gameName");

  response.json(games);
});

app.get("/api/game/:gameName", async (request, response) => {
  const { gameName } = request.params;

  const db = await getDb();
  const gameMoves = db("moves").where({ gameName }).join("users", "moves.userId", "users.id");

  if (gameMoves.length == 0 && !config.games[gameName]) {
    response.status(404);
    response.json({ error: `Unknown game "${gameName}"` });
    return;
  }

  // The previous turn should be complete
  const lastNotification = await gameMoves.clone().orderBy("receivedAt", "desc").first("*");

  let players = null;

  if (lastNotification.turnNumber > 1) {
    const playerCount = (await gameMoves.clone().distinct("userId")).length;

    let tryTurn = lastNotification.turnNumber - 1;
    while (!players && tryTurn >= 1) {
      let turnPlayers = await gameMoves
        .clone()
        .where({ turnNumber: tryTurn })
        .orderBy("receivedAt", "ascending")
        .pluck("civilizationUsername");

      if (turnPlayers.length == playerCount) {
        players = turnPlayers;
        break;
      } else {
        tryTurn -= 1;
      }
    }
  }

  // No turns were complete? Guess by received date.
  if (!players) {
    players = await gameMoves
      .clone()
      .orderBy("receivedAt", "ascending")
      .distinct("civilizationUsername")
      .pluck("civilizationUsername");
  }

  response.json({
    name: gameName,
    players,
    turnNumber: lastNotification.turnNumber,
    currentPlayer: lastNotification.civilizationUsername,
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
  const moves = await db("moves").join("users", "moves.userId", "users.id").where({ gameName });

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
