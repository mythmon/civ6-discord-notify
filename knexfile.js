/* eslint-env commonjs, node */
module.exports = {
  client: "sqlite3",
  connection: {
    filename: "./.data/db.sqlite3"
  },
  migrations: {
    tableName: "knex_migrations"
  },
  useNullAsDefault: true,
};
