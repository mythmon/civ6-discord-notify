exports.up = async (knex) => {
  await knex.schema.table("moves", (table) => {
    table.integer("gameId");
  });

  const gameNameToId = new Map();

  for (const game of await knex("games").select()) {
    gameNameToId.set(game.name, game.id);
  }

  for (const move of await knex("moves").select("*")) {
    if (!gameNameToId.has(move.gameName)) {
      let [newGameId] = await knex("games").insert({ name: move.gameName });
      gameNameToId.set(move.gameName, newGameId);
    }

    const gameId = gameNameToId.get(move.gameName);
    await knex("moves").update({ gameId }).where({ id: move.id });
  }

  await knex.schema.alterTable("moves", (table) => {
    table.dropColumn("gameName");
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable("moves", (table) => {
    table.string("gameName");
  });

  for (const game of await knex("games").select()) {
    await knex("moves")
      .update({ gameName: game.name })
      .where({ gameId: game.id });
  }

  await knex.schema.alterTable("moves", (table) => {
    table.dropColumn("gameId");
  });
};
