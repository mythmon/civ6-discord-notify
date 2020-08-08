module.exports.up = async (knex) => {
  await knex.schema.createTable("games", (table) => {
    table.increments("id").primary().unique().notNullable();
    table.string("name").unique().notNullable();
    table.string("webhookUrl");
    table.index("name");
  });

  if (process.env.GAMES_TO_WEBHOOKS) {
    await Promise.all(
      process.env.GAMES_TO_WEBHOOKS.split(",")
        .map((gameNameAndUrl) => gameNameAndUrl.split("="))
        .map(([name, webhookUrl]) =>
          knex("games").insert({ name, webhookUrl })
        )
    );
  }
};

module.exports.down = async (knex) => {
  await knex.schema.dropTable("games");
};
