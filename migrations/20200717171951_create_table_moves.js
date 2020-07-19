module.exports.up = async (knex) => {
  await knex.schema.createTable("moves", (table) => {
    table.increments("id");
    table.string("playerCivName");
    table.string("gameName");
    table.integer("turnNumber").unsigned();
    table.timestamp("receivedAt", { useTz: true }).defaultTo(knex.fn.now());
  });
};

module.exports.down = async (knex) => {
  await knex.schema.dropTable("moves");
};
