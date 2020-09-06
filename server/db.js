const knex = require("knex");
const seedrandom = require("seedrandom");
const { Model, QueryBuilder } = require("objection");
const d3 = {
  ...require("d3-color"),
};

const config = require("./config.js");

const knexInstance = knex(config.db);
Model.knex(knexInstance);

module.exports.runMigrations = async () => {
  await knexInstance.migrate.latest();
};

module.exports.getDb = () => {
  return knexInstance;
};

class QueryBuilderExt extends QueryBuilder {
  async findOneOrInsert(where, defaults = {}) {
    let rv = await this.findOne(where);
    if (!rv) {
      rv = await this.insert({ ...where, ...defaults });
    }
    return rv;
  }
}

class BaseModel extends Model {}

BaseModel.QueryBuilder = QueryBuilderExt;

module.exports.User = class User extends BaseModel {
  static tableName() {
    return "users";
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: [],
      properties: {
        id: { type: "integer" },
        discordId: { type: ["string", "null"], maxLength: 20 },
        civilizationUsername: { type: "string", minLength: 1, maxLength: 255 },
      },
    };
  }

  static get relationMappings() {
    return {
      moves: {
        relation: Model.HasManyRelation,
        modelClass: module.exports.Move,
        join: {
          from: "users.id",
          to: "moves.userId",
        },
      },
    };
  }
};

module.exports.Game = class Game extends BaseModel {
  static get tableName() {
    return "games";
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["name", "state"],
      properties: {
        id: { type: "integer" },
        name: { type: "string", minLength: 1, maxLength: 255 },
        webhookUrl: { type: ["string", null], minLength: 1, maxLength: 255 },
        state: { type: "string", enum: ["live", "archived", "finished", "pending"] },
        winnerId: { type: "integer" },
      },
    };
  }

  static get relationMappings() {
    return {
      moves: {
        relation: Model.HasManyRelation,
        modelClass: module.exports.Move,
        join: {
          from: "games.id",
          to: "moves.gameId",
        },
      },
      winner: {
        relation: Model.HasOneRelation,
        modelClass: module.exports.User,
        join: {
          from: "games.winnerId",
          to: "users.id",
        },
      },
    };
  }

  color({ format }) {
    const rng = seedrandom(`highlight-${this.name}`);
    const a = randRange(rng, -160, 160);
    const b = randRange(rng, -160, 160);
    const l = randRange(rng, 70, 90);
    const colorObj = d3.lab(l, a, b);
    switch (format) {
      case "hex":
        return colorObj.formatHex();
      case "discord":
        return parseInt(colorObj.formatHex().slice(1), 16);
      default:
        throw new Error(`Unknown color format '${format}'`);
    }
  }
};

module.exports.Move = class Move extends BaseModel {
  static get tableName() {
    return "moves";
  }

  static get jsonSchema() {
    return {
      type: "object",
      required: ["turnNumber", "userId", "gameId"],
      properties: {
        id: { type: "integer" },
        turnNumber: { type: "number" },
        receivedAt: { type: "date" },
        userId: { type: "number" },
        gameId: { type: "number" },
      },
    };
  }

  static get relationMappings() {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: module.exports.User,
        join: {
          from: "moves.userId",
          to: "users.id",
        },
      },
      game: {
        relation: Model.BelongsToOneRelation,
        modelClass: module.exports.Game,
        join: {
          from: "moves.gameId",
          to: "games.id",
        },
      },
    };
  }
};

function randRange(rng, min, max) {
  return rng.quick() * (max - min) + min;
}
