exports.up = async (knex) => {
  await knex.schema.alterTable("games", (table) => {
    table.string("state").default("live");
    table.integer("winnerId");
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable("games", (table) => {
    table.dropColumn("state");
    table.dropColumn("winnerId");
  });
};
