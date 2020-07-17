exports.up = function(knex) {
  knex.createTable('moves', table => {
    table.increments('id');
    table.string('playerCivName');
    table.string('gameName');
    table.integer('turnNumber').unsigned();
    table.timestamp('created_at', { useTz: true });
  })
};

exports.down = function(knex) {
  
};
