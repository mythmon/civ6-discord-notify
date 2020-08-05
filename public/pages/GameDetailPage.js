import React, { useMemo, Suspense } from "/deps/react.js";
import { html } from "/deps/htm.js";
import dateFns from "/deps/datefns.js";

import { useApi } from "/api.js";

const TurnDensityChart = React.lazy(() => import("/TurnDensityChart.js"));
const TurnSpiralChart = React.lazy(() => import("/TurnSpiralChart.js"));

export default function GameDetail({ name: gameName }) {
  const { data: detail, error } = useApi(`/api/game/${gameName}`);
  const { gameHistory, historyError } = useHistory(gameName);

  const { currentPlayer, turnNumber, lastUpdated, players } = detail ?? {};

  if (error) {
    return html`
      <h2>${gameName}</h2>
      <p>${error.toString()}</p>
    `;
  }

  if (!detail) {
    return html`
      <h2>${gameName}</h2>
      <p>...</p>
    `;
  }

  return html`
    <h2>${gameName} - Turn ${turnNumber}</h2>
    <${RoundProgress} players=${players} currentPlayer=${currentPlayer} />
    ${historyError && html`<p>${historyError.toString()}</p>`}
    ${gameHistory &&
    html`
      <${Suspense} fallback=${html`<div>...</div>`}>
        <${TurnDensityChart} gameHistory=${gameHistory} />
      <//>
      <${Suspense} fallback=${html`<div>...</div>`}>
        <${TurnSpiralChart} gameHistory=${gameHistory} />
      <//>
    `}
    <footer>Last updated <${Time} datetime=${lastUpdated} />.</footer>
  `;
}

function RoundProgress({ players, currentPlayer }) {
  let foundCurrent = false;

  return html`<ul class="round-progress">
    ${players.map((player) => {
      let status;

      if (foundCurrent) {
        status = "upcoming";
      } else {
        if (player == currentPlayer) {
          foundCurrent = true;
          status = "current";
        } else {
          status = "previous";
        }
      }

      return html`<li class="turn turn-${status}">${player}</li>`;
    })}
  </ul> `;
}

function Time({ datetime, relative = true }) {
  if (typeof datetime == "string") {
    const parsed = new Date(datetime);
    if (!isNaN(parsed)) {
      datetime = parsed;
    } else {
      return html`<time>${datetime}</time>`;
    }
  }

  let displayAbsolute = datetime.toLocaleString({
    timeZoneName: "short",
    hour12: false,
  });
  let display = displayAbsolute;
  if (relative) {
    display = dateFns.formatRelative(datetime, new Date());
  }
  return html`<time datetime=${datetime.toISOString()} title=${displayAbsolute}>${display}</time>`;
}

function useHistory(gameName) {
  const { data: originalHistory, error: historyError } = useApi(`/api/game/${gameName}/history`);

  const gameHistory = useMemo(() => {
    if (!originalHistory) {
      return null;
    }
    const modifiedHistory = { turnNotifications: [] };
    for (const originalNotif of originalHistory.turnNotifications) {
      const notif = { ...originalNotif };
      if (typeof notif.receivedAt == "string") {
        if (!notif.receivedAt.endsWith("Z")) {
          notif.receivedAt += "Z";
        }
        notif.receivedAt = new Date(notif.receivedAt);
      }

      if (notif.fractionOfDay == undefined) {
        notif.fractionOfDay =
          notif.receivedAt.getHours() / 24 +
          notif.receivedAt.getMinutes() / (24 * 60) +
          notif.receivedAt.getSeconds() / (24 * 60 * 60);
      }
      modifiedHistory.turnNotifications.push(notif);
    }

    return modifiedHistory;
  }, [originalHistory]);

  return { gameHistory, historyError };
}
