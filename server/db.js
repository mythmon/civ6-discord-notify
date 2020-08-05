const knex = require("knex");

const config = require("./config.js");

let cachedDb = null;
let ranMigrations = false;

module.exports.getDb = async () => {
  const db = module.exports.getDbSync();
  if (!ranMigrations) {
    await db.migrate.latest();
  }
  return db;
};

module.exports.getDbSync = () => {
  if (!cachedDb) {
    cachedDb = knex(config.db);
  }
  return cachedDb;
};
