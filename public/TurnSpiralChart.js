import { html } from "/deps/htm.js";
import d3 from "/deps/d3.js";

import dateFns from "/deps/datefns.js";

export default function TurnSpiralChart({ gameHistory: { turnNotifications } }) {
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
                    fill=${colors(notif.civilizationUsername)}
                  />
                `
            )}
          </g>
        </g>
      </svg>
    </div>
  `;
}
