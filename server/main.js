const path = require("path");

const cors = require("cors");
const express = require("express");
const fallback = require("express-history-api-fallback");
const csvStringify = require("csv-stringify");
const morgan = require("morgan");

const config = require("./config.js");
const { getDb } = require("./db.js");
const { sendTurnNotification } = require("./discord.js");
const auth = require("./auth.js");

const root = path.resolve(__dirname + "/../public");

// preload database
getDb();

const app = express();

const logFormatter = morgan.compile(":method :url :status");
app.use(
  morgan((tokens, req, res) => {
    if (res.statusCode == 304) {
      return null;
    }
    return logFormatter(tokens, req, res);
  })
);

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

  const db = await getDb();

  const game = await db("games").where({ name: gameName }).first();
  if (!game) {
    const game = { name: gameName };
    const [newId] = await db("games").insert(game);
    game.id = newId;
  }

  const user = await db("users").where({ civilizationUserName }).first();

  await db("moves").insert({ userId: user.id, gameId: game.id, turnNumber });

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
  const games = await db("games").select("id", "name");

  response.json(games);
});

app.get("/api/game/:gameName", async (request, response) => {
  const { gameName } = request.params;

  const db = await getDb();
  const gameMoves = db("moves")
    .where({ "games.name": gameName })
    .join("games", "moves.gameId", "games.id")
    .join("users", "moves.userId", "users.id");

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

  const db = await getDb();

  const game = await db("games").where({ name: gameName }).first("id", "name");

  const moves = (
    await db("moves")
      .join("users", "moves.userId", "users.id")
      .where({ gameId: game.id })
      .select(
        "moves.id",
        "turnNumber",
        "receivedAt",
        "users.civilizationUsername",
        "users.discordId"
      )
  ).map((move) => {
    delete move.userId;
    return move;
  });

  for (const move of moves) {
    let d = new Date(move.receivedAt);
    move.receivedAt = d.toISOString();
  }

  if (ext == null || ext == "json") {
    response.json({
      ...game,
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
