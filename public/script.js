import {
  html,
  render,
  Link,
  Route as _Route,
  Switch,
  useSWR,
  useState,
  useMemo,
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
  // const url = new URL("https://fungeon-civ6-discord-notify.glitch.me");
  // real
  const url = new URL(window.location);

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

function GameDetail({ name: gameName }) {
  const { data: detail, error } = useApi(`/api/game/${gameName}`);

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

  const { currentPlayer, turnNumber, lastUpdated, players } = detail;
  const { gameHistory, historyError } = useHistory(gameName);

  return html`
    <h2>${gameName} - Turn ${turnNumber}</h2>
    <${RoundProgress} players=${players} currentPlayer=${currentPlayer} />
    ${historyError && html`<p>${historyError.toString()}</p>`}
    ${gameHistory &&
    html`
      <${TurnDensityChart} gameHistory=${gameHistory} />
      <${TurnSpiralChart} gameHistory=${gameHistory} />
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

function TurnDensityChart({ gameHistory }) {
  const { slider: kernelSlider, value: kernelParameter } = useSlider({
    min: 0.05,
    max: 3,
    step: 0.05,
    defaultValue: 1.3,
  });

  const margin = { top: 30, right: 10, bottom: 20, left: 10 };
  const width = 800;
  const height = 400;

  const { turnNotifications } = gameHistory;
  const names = [];

  for (const notif of turnNotifications) {
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
    <div>
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
    </div>
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

function TurnSpiralChart({ gameHistory: { turnNotifications } }) {
  const size = 400;
  const margin = { top: 70, right: 75, bottom: 20, left: 75 };

  const _radius = d3
    .scaleTime()
    .domain(d3.extent(turnNotifications, (d) => d.receivedAt))
    .range([40, size / 2]);
  const radiusStep = _radius(dateFns.startOfTomorrow()) - _radius(dateFns.startOfToday());
  // const radius = (notif) => _radius(notif) + ((Math.random() - 0.5) * radiusStep) / 3;
  const radius = _radius;

  const angle = d3
    .scaleTime()
    .domain([dateFns.startOfToday(), dateFns.startOfTomorrow()])
    .range([-Math.PI / 2, (Math.PI * 3) / 2]);

  const x = (d) => Math.cos(angle(d)) * radius(d);
  const y = (d) => Math.sin(angle(d)) * radius(d);
  const colors = d3.scaleOrdinal(d3.schemeCategory10);

  const left = d3.min(turnNotifications, (d) => x(d.receivedAt));
  const top = d3.min(turnNotifications, (d) => y(d.receivedAt));

  const now = new Date();
  const dateLineData = [];
  for (let d = _radius.domain()[0]; d <= now; d = dateFns.add(d, { minutes: 5 })) {
    dateLineData.push(d);
  }
  const dateLineShape = d3.line().x(x).y(y)(dateLineData);

  const innerGridRadius = _radius.range()[0] - 10;
  const outerGridRadius = _radius.range()[1] + 10;
  const gridLines = [];
  for (
    let ts = dateFns.startOfToday();
    ts < dateFns.startOfTomorrow();
    ts = dateFns.add(ts, { hours: 3 })
  ) {
    const lineAngle = angle(ts);
    const x1 = Math.cos(lineAngle) * innerGridRadius;
    const x2 = Math.cos(lineAngle) * outerGridRadius;
    const y1 = Math.sin(lineAngle) * innerGridRadius;
    const y2 = Math.sin(lineAngle) * outerGridRadius;
    const labelX = Math.cos(lineAngle) * (outerGridRadius + 25);
    const labelY = Math.sin(lineAngle) * (outerGridRadius + 13);

    gridLines.push(
      html`
        <line x1=${x1} y1=${y1} x2=${x2} y2=${y2} stroke="#666" stroke-width="1" />
        <g transform="translate(-2, 6)">
          <text x=${labelX} y=${labelY} text-anchor="middle">${dateFns.format(ts, "H:mm")}</text>
        </g>
      `
    );
  }

  return html`
    <div>
      <svg width=${size + margin.left + margin.right} height=${size + margin.top + margin.bottom}>
        <g transform="translate(${margin.left - left} ${margin.top - top})">
          <g class="grid-lines">${gridLines}</g>
          <path
            d=${dateLineShape}
            fill="none"
            stroke="rgba(200,200,200,0.8)"
            stroke-width=${radiusStep / 2}
            stoke-linecap="round"
          />
          <g className="turn-dots">
            ${turnNotifications.map(
              (notif) =>
                html`
                  <circle
                    cx=${x(notif.receivedAt)}
                    cy=${y(notif.receivedAt)}
                    r="2"
                    fill=${colors(notif.playerCivName)}
                  />
                `
            )}
          </g>
        </g>
      </svg>
    </div>
  `;
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
  });

  return { gameHistory, historyError };
}
