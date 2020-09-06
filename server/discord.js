const fetch = require("node-fetch");

const config = require("./config.js");

module.exports.sendTurnNotification = async ({ user, game, turnNumber }) => {
  if (!game.webhookUrl) {
    return;
  }

  let playerMention = user.civilizationUsername;
  let allowed_mentions = {};
  if (user.discordId) {
    playerMention = `<@${user.discordId}>`;
    allowed_mentions.users = [user.discordId];
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
          color: game.color({ format: "discord" }),
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
      let gameMention;
      if (config.projectDomain) {
        let gameUrl = `${config.projectDomain}/api/game/${encodeURIComponent(game.name)}`;
        gameMention = `[${game.name}](${gameUrl})`;
      } else {
        gameMention = game.name;
      }

      discordPayload.content = `It's ${playerMention}'s turn on ${gameMention}.`;
      discordPayload.embeds = [
        {
          title: game.name,
          color: game.color({ format: "discord" }),
          fields: [{ name: "Round", value: `${turnNumber}`, inline: true }],
        },
      ];
      break;
    }

    default: {
      throw new Error(`Unknown messageStyle ${config.messageStyle}`);
    }
  }

  const url = new URL(game.webhookUrl);
  url.searchParams.set("wait", true);
  const body = JSON.stringify(discordPayload);

  const maxAttemps = 3;
  let success = false;
  let res;
  console.log(
    `Sending Discord notification to ${user.civilizationUsername} for game ${game.name} turn ${turnNumber}`
  );
  for (let attemptNumber = 0; attemptNumber < maxAttemps; attemptNumber++) {
    res = await fetch(url, {
      method: "post",
      body,
      headers: { "Content-Type": "application/json" },
    });

    if (res.status == 200) {
      success = true;
      break;
    } else if (res.status == 429 && attemptNumber + 1 < maxAttemps) {
      const retrySec = res.headers.get("x-ratelimit-reset-after") || 1;
      console.log(
        `Rate limited. Waiting ${retrySec} seconds to retry for ${
          user.civilizationUsername
        }, attempt ${attemptNumber + 2} of ${maxAttemps}`
      );
      await new Promise((resolve) => setTimeout(resolve, retrySec * 1000));
    } else {
      throw new Error(
        `Unexpected response from Discord notification:\n` +
          `:: Status: ${res.status} \n` +
          `:: Headers: ${JSON.stringify(res.headers.raw())}\n` +
          `:: Body: ${await res.text()}`
      );
    }
  }

  if (!success) {
    throw new Error("Could not send notification:", await res.text());
  }
};
