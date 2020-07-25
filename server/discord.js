const fetch = require("node-fetch");

const config = require("./config.js");

module.exports.sendTurnNotification = async ({ player, game, turnNumber }) => {
  let playerMention = player.civName;
  let allowed_mentions = {};
  const playerObj = config.players[player.civName];
  if (playerObj && playerObj.discordId) {
    playerMention = `<@${playerObj.discordId}>`;
    allowed_mentions.users = [playerObj.discordId];
  }

  const discordPayload = {
    username: "Civilization VI",
    avatar_url:
      "https://cdn.glitch.com/72884494-98c1-49e5-a144-3cc3e5f2a6a3%2Fciv6%20icon.jpg?v=1594946929396",
    allowed_mentions,
  };

  switch (config.messageStyle) {
    case "embed": {
      discordPayload.embeds = [
        {
          title: game.name,
          color: 0x05d458,
          description: `It's ${playerMention}'s turn on round ${turnNumber}.`,
        },
      ];
      break;
    }

    case "plain": {
      discordPayload.content = `It's ${playerMention}'s turn on ${game.name} round ${turnNumber}.`;
      break;
    }

    case "hybrid": {
      discordPayload.content = `It's ${playerMention}'s turn on ${game.name}.`;
      discordPayload.embeds = [
        {
          title: game.name,
          color: 0x05d458,
          fields: [{ name: "Round", value: `${turnNumber}`, inline: true }],
        },
      ];
      break;
    }

    default: {
      res.status(500);
      res.send();
      throw new Error(`Unknown messageStyle ${config.messageStyle}`);
    }
  }

  const url = new URL(game.webhookUrl);
  url.searchParams.set("wait", true);
  const body = JSON.stringify(discordPayload);
  console.log("POST", url.toString());
  console.log("::", body);
  const res = await fetch(url, {
    method: "post",
    body,
    headers: { "Content-Type": "application/json" },
  });
};
