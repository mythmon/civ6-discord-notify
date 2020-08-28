const path = require("path");

const cors = require("cors");
const express = require("express");
const fallback = require("express-history-api-fallback");
const csvStringify = require("csv-stringify");
const morgan = require("morgan");

const config = require("./config.js");
const { runMigrations, Game, User, Move } = require("./db.js");
const { sendTurnNotification } = require("./discord.js");
const auth = require("./auth.js");

const root = path.resolve(__dirname + "/../public");

runMigrations();

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
    Value2: civilizationUsername,
    Value3: turnNumber,
    silent = false,
  } = request.body;

  turnNumber = parseInt(turnNumber);

  if (typeof silent == "string") {
    silent = !!JSON.parse(silent);
  }

  if (turnToken !== config.turnToken) {
    console.warn("bad turn token", turnToken);
    response.status(403);
    response.json({ error: "bad turn token" });
    return;
  }

  if (
    await Move.query().joinRelated("game").joinRelated("user").findOne({
      "user.civilizationUsername": civilizationUsername,
      "game.name": gameName,
      turnNumber,
    })
  ) {
    response.status(409);
    response.json({ error: "turn already exists" });
    return;
  }

  const game = await Game.query().findOneOrInsert({ name: gameName });
  const user = await User.query().findOneOrInsert({ civilizationUsername });
  await Move.query().insert({ userId: user.id, gameId: game.id, turnNumber });

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
  const games = await Game.query().select("id", "name");
  response.json(games);
});

app.get("/api/game/:gameName", async (request, response) => {
  const { gameName } = request.params;

  const gameMoves = Move.query()
    .joinRelated("game")
    .joinRelated("user")
    .where({ "game.name": gameName })
    .withGraphFetched("[user, game]");

  // The previous turn should be complete
  const lastNotification = await gameMoves.clone().orderBy("receivedAt", "desc").first();

  let players = null;

  if (lastNotification.turnNumber > 1) {
    const playerCount = (await gameMoves.clone().distinct("userId")).length;

    let tryTurn = lastNotification.turnNumber - 1;
    while (!players && tryTurn >= lastNotification.turnNumber - 10) {
      let turnMoves = await gameMoves
        .clone()
        .where({ turnNumber: tryTurn })
        .orderBy("receivedAt", "ascending");

      if (turnMoves.length == playerCount) {
        players = turnMoves.map((turn) => turn.user);
        break;
      } else {
        tryTurn -= 1;
      }
    }
  }

  // No turns were complete? Guess by received date.
  if (!players) {
    players = (
      await gameMoves
        .clone()
        .orderBy("receivedAt", "ascending")
        .distinct("user.civilizationUsername")
    ).map((turn) => turn.user);
  }

  response.json({
    name: gameName,
    players: players.map((p) => p.civilizationUsername),
    turnNumber: lastNotification.turnNumber,
    currentPlayer: lastNotification.user.civilizationUsername,
    lastUpdated: new Date(lastNotification.receivedAt).toISOString(),
  });
});

app.get("/api/game/:gameName/history.:ext?", async (request, response) => {
  const { gameName, ext } = request.params;

  const game = await Game.query().findOne({ name: gameName }).select("id", "name");

  const moves = (
    await Move.query()
      .joinRelated("user")
      .where({ gameId: game.id })
      .select("moves.id", "turnNumber", "receivedAt", "user.civilizationUsername", "user.discordId")
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
