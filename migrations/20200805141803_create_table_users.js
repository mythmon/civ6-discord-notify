module.exports.up = async (knex) => {
  await knex.schema.createTable("users", (table) => {
    table.increments("id").primary().unique().notNullable();
    table.string("discordId", 20).nullable();
    table.string("civilizationUsername").unique().notNullable();
    table.index("civilizationUsername");
  });

  if (process.env.PLAYER_IDS) {
    await Promise.all(
      process.env.PLAYER_IDS.split(",")
        .map((civNameAndDiscordId) => civNameAndDiscordId.split("="))
        .map(([civilizationUsername, discordId]) =>
          knex("users").insert({ civilizationUsername, discordId })
        )
    );
  }
};

module.exports.down = async (knex) => {
  await knex.schema.dropTable("users");
};
