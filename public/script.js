import {
  html,
  render,
  Link,
  Route as _Route,
  Switch,
  useSWR,
} from "https://cdn.skypack.dev/swree@^1.1.0/";
import * as d3 from "https://cdn.skypack.dev/d3@^5.16.0/";

import dateFns from "./datefns.js";

render(App(), document.querySelector("#target"));

function App() {
  return html`
    <h1><${Link} href="/">Civilization 6 Game Tracker<//></h1>

    <${Switch}>
      <${Route} path="/"><${GamesList} /><//>
      <${Route} path="/g/:name" component=${GameDetail}><//>
    <//>
  `;
}

function Route({ path, component, children }) {
  return html`
    <${_Route} path=${path}>
      ${(params) => {
        if (children && !component) {
          return html`${children}`;
        } else if (component) {
          const transformedParams = Object.fromEntries(
            Object.entries(params).map(([key, value]) => [key, decodeURIComponent(value)])
          );
          return html`<${component} ...${transformedParams}>${children}<//>`;
        } else {
          throw new Error("Must pass either component or children or both");
        }
      }}
    <//>
  `;
}

function useApi(key) {
  const minute = 60 * 1000;
  return useSWR(key, fetcher, { refreshInterval: 5 * minute });
}

async function fetcher(key) {
  // debug
  const url = new URL("https://fungeon-civ6-discord-notify.glitch.me");
  url.pathname = key;

  const res = await fetch(url);
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
}

function GamesList() {
  const { data: games, error } = useApi("/api/game");

  if (error) {
    console.error("GamesList error", error);
    return html`<p>Error: ${error.toString()}</p>`;
  }

  if (!games) {
    return html`
      <ul>
        <li>...</li>
      </ul>
    `;
  }

  return html`
    <ul>
      ${games.map(
        (game) => html`
          <li>
            <${Link} href=${`/g/${game.gameName}`}>
              ${game.gameName}
            <//>
          </li>
        `
      )}
    </ul>
  `;
}

function GameDetail({ name }) {
  const { data: detail, error } = useApi(`/api/game/${name}`);

  if (error) {
    return html`
      <h2>${name}</h2>
      <p>${error.toString()}</p>
    `;
  }

  if (!detail) {
    return html`
      <h2>${name}</h2>
      <p>...</p>
    `;
  }

  const { currentPlayer, turnNumber, lastUpdated, players } = detail;

  return html`
    <h2>${name} - Turn ${turnNumber}</h2>
    <${RoundProgress} players=${players} currentPlayer=${currentPlayer} />
    <${TurnChart} gameName=${name} />
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

function TurnChart({ gameName }) {
  const { data: history, error } = useApi(`/api/game/${gameName}/history`);

  if (error) {
    return html`<div>${error.toString}</div>`;
  }

  if (!history) {
    return null;
  }

  const margin = { top: 30, right: 10, bottom: 20, left: 10 };
  const width = 500;
  const height = 400;

  const { turnNotifications } = history;
  for (const notif of turnNotifications) {
    if (!notif.receivedAt.endsWith("Z")) {
      notif.receivedAt += "Z";
    }
    notif.receivedAt = new Date(notif.receivedAt);
  }

  let bins = {};
  const names = [];
  for (const notif of turnNotifications) {
    let hour = notif.receivedAt.getHours();
    if (!bins[hour]) {
      bins[hour] = [];
    }
    bins[hour].push({ hour: hour, player: notif.playerCivName, rank: bins[hour].length });
    if (!names.includes(notif.playerCivName)) {
      names.push(notif.playerCivName);
    }
  }
  const data = Object.values(bins).flatMap((x) => x);

  const x = d3
    .scaleLinear()
    .domain([0, 24])
    .range([margin.left, width - margin.right]);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.rank)])
    .range([height - margin.bottom, margin.top]);

  const colors = d3.scaleOrdinal(d3.schemeCategory10);

  const size = Math.min(x(1) - x(0), y(0) - y(1)) - 1;

  const xAxis = d3.axisBottom(x);

  return html`
    <p>Colored by who's turn <b>is starting</b></p>
    <div>
      ${names.map(
        (name) =>
          html`<span><span class="swatch" style=${{ backgroundColor: colors(name) }} />${name}<//>`
      )}
    </div>
    <svg width=${width} height=${height}>
      ${data.map(
        (d, idx) => html`
          <rect
            key=${idx}
            x=${x(d.hour)}
            y=${y(d.rank) - size}
            width=${size}
            height=${size}
            fill=${colors(d.player)}
          />
        `
      )}
      <g
        transform="translate(0, ${height - margin.bottom})"
        ref=${(g) => d3.select(g).call(xAxis)}
      />
    </svg>
  `;
}
