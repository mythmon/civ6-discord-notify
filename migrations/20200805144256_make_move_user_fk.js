exports.up = async (knex) => {
  await knex.schema.table("moves", (table) => {
    table.integer("userId");
  });

  const civNameToId = new Map();

  for (const user of await knex("users").select()) {
    civNameToId.set(user.civilizationUsername, user.id);
  }

  for (const move of await knex("moves").select("*")) {
    if (!civNameToId.has(move.playerCivName)) {
      let [newUserId] = await knex("users").insert({ civilizationUsername: move.playerCivName });
      civNameToId.set(move.playerCivName, newUserId);
    }

    const userId = civNameToId.get(move.playerCivName);
    await knex("moves").update({ userId }).where({ id: move.id });
  }

  await knex.schema.alterTable("moves", (table) => {
    table.dropColumn("playerCivName");
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable("moves", (table) => {
    table.string("playerCivName");
  });

  for (const user of await knex("users").select()) {
    await knex("moves")
      .update({ playerCivName: user.civilizationUsername })
      .where({ userId: user.id });
  }

  await knex.schema.dropTable("users");

  await knex.schema.alterTable("moves", (table) => {
    table.dropColumn("userId");
  });
};
