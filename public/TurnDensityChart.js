import { useState } from "/deps/react.js";
import { html } from "/deps/htm.js";
import d3 from "/deps/d3.js";

export default function TurnDensityChart({ gameHistory }) {
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
