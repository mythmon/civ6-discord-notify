exports.up = function(knex) {
  knex.createTable('moves', table => {
    table.increments('id');
    table.string('playerCivName');
    table.string('gameName');
    table.integer('turnNumber').unsigned();
    table.timestamp('receivedAt', { useTz: true }).defaultTo(knex.fn.now());
  })
};

exports.down = function(knex) {
  knex.schema.dropTable('moves');
};
