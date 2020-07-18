import knex from "knex";

import config from "./config.js";

let cachedDb = null;

export async function getDb() {
  if (!cachedDb) {
    cachedDb = knex(config.db);
    // Run all the migrations
    await cachedDb.migrate.latest();
  }
  return cachedDb;
}
