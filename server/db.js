const knex = require("knex");

const config = require("./config.js");

let cachedDb = null;

module.exports.getDb = async () => {
  if (!cachedDb) {
    cachedDb = knex(config.db);
    // Run all the migrations
    await cachedDb.migrate.latest();
  }
  return cachedDb;
};
