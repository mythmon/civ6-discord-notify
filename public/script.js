import {
  html,
  render,
  Link,
  Route as _Route,
  Switch,
  useSWR,
  useState,
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
    <${TurnDensityChart} gameName=${name} />
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

function TurnDensityChart({ gameName }) {
  const { data: history, error } = useApi(`/api/game/${gameName}/history`);
  const { slider: kernelSlider, value: kernelParameter } = useSlider({
    min: 0.05,
    max: 3,
    step: 0.05,
    defaultValue: 1.3,
  });

  if (error) {
    return html`<div>${error.toString}</div>`;
  }

  if (!history) {
    return null;
  }

  const margin = { top: 30, right: 10, bottom: 20, left: 10 };
  const width = 800;
  const height = 400;

  const { turnNotifications } = history;
  const names = [];
  for (const notif of turnNotifications) {
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

    if (!names.includes(notif.playerCivName)) {
      names.push(notif.playerCivName);
    }
  }

  const x = d3
    .scaleLinear()
    .domain([0, 24])
    .range([margin.left, width - margin.right]);
  const xAxis = d3.axisBottom(x);

  const kde = kernelDensityEstimator(kernelEpanechnikov(kernelParameter), x.ticks(40));
  const combinedDensity = kde(turnNotifications.map((notif) => notif.fractionOfDay * 24));

  const densityByPlayer = [];
  for (const name of names) {
    densityByPlayer.push([
      name,
      kde(
        turnNotifications
          .filter((notif) => notif.playerCivName == name)
          .map((notif) => notif.fractionOfDay * 24)
      ),
    ]);
  }

  const allDensities = densityByPlayer.flatMap(([, d]) => d).concat(combinedDensity);

  const densityY = d3
    .scaleLinear()
    .domain([0, d3.max(allDensities, (d) => d[1])])
    .range([height - margin.bottom, margin.top]);

  const colors = d3.scaleOrdinal(d3.schemeCategory10);
  const overallCurve = d3
    .area()
    .curve(d3.curveBasis)
    .x((d) => x(d[0]))
    .y0(densityY(0))
    .y1((d) => densityY(d[1]));
  const playerCurve = d3
    .line()
    .curve(d3.curveBasis)
    .x((d) => x(d[0]))
    .y((d) => densityY(d[1]));

  return html`
    <p>Colored by who's turn <b>is starting</b></p>
    <div>
      ${names.map(
        (name) =>
          html`<span><span class="swatch" style=${{ backgroundColor: colors(name) }} />${name}<//>`
      )}
    </div>
    <div>${kernelParameter} ${kernelSlider}</div>
    <svg width=${width} height=${height}>
      <path fill="#ccc" d=${overallCurve(combinedDensity)} />
      ${densityByPlayer.map(
        ([player, density]) =>
          html`
            <path
              fill="none"
              stroke=${colors(player)}
              stroke-width="2"
              opacity="0.5"
              d=${playerCurve(density)}
            />
          `
      )}
      ${turnNotifications.map(
        (notif) => html`
          <line
            x1=${x(notif.fractionOfDay * 24)}
            x2=${x(notif.fractionOfDay * 24)}
            y1=${height - margin.bottom}
            y2=${height}
            stroke=${colors(notif.playerCivName)}
            opacity="0.8"
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

// Function to compute density
function kernelDensityEstimator(kernel, xPoints) {
  return (data) => {
    return xPoints.map((x) => [x, d3.mean(data, (v) => kernel(x - v))]);
  };
}

function kernelEpanechnikov(k) {
  return (v) => {
    return Math.abs((v /= k)) <= 1 ? (0.75 * (1 - v * v)) / k : 0;
  };
}

function useSlider({ min, max, step, defaultValue }) {
  if (min >= max) {
    throw new Error("min must be less than max");
  }
  const [value, setValue] = useState(defaultValue ?? min + (max - min) / 2);
  const slider = html`<input
    type="range"
    min=${min}
    max=${max}
    step=${step}
    value=${value}
    onInput=${(ev) => {
      console.log("slider onInput", ev);
      setValue(ev.target.valueAsNumber);
    }}
  />`;

  return { slider, value };
}
