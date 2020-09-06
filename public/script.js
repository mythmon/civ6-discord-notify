import React, { Suspense, render } from "/deps/react.js";
import { html } from "/deps/htm.js";
import { Link, Switch, Route as WouterRoute } from "/deps/wouter.js";

import ErrorBoundary from "/ErrorBoundary.js";
import { useApi } from "/api.js";
import { AuthIcon } from "/components/auth.js";

const GameDetailPage = React.lazy(() => import("/pages/GameDetailPage.js"));

render(App(), document.querySelector("#target"));

function App() {
  return html`
    <div class="wrapper">
      <header>
        <h1><${Link} href="/">Civilization 6 Game Tracker<//></h1>
        <${AuthIcon} />
      </header>

      <main>
        <${ErrorBoundary}>
          <${Suspense} fallback=${html`<div></div>`}>
            <${Switch}>
              <${Route} path="/"><${GamesList} /><//>
              <${Route} path="/g/:name" component=${GameDetailPage}><//>
            <//>
          <//>
        <//>
      </main>
    </div>
  `;
}

function Route({ path, component, children }) {
  return html`
    <${WouterRoute} path=${path}>
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

function GamesList() {
  const { data: games, error } = useApi("/api/game");

  if (error) {
    console.error("GamesList error", error);
    return html`<p>Error: ${error.toString()}</p>`;
  }

  if (!games) {
    return html`
      <ul>
        <li></li>
      </ul>
    `;
  }

  let warning = null;
  const gamesByState = new Map();
  for (const game of games) {
    if (!gamesByState.has(game.state)) {
      gamesByState.set(game.state, []);
    }
    gamesByState.get(game.state).push(game);
  }

  let unexpectedStates = Array.from(gamesByState.keys()).filter(
    (state) => !["live", "pending", "archived", "finished"].includes(state)
  );

  if (unexpectedStates.length) {
    warning = html`<span class="warning">Unexpected states ${unexpectedStates.join(", ")}</span>`;
  }

  let numArchived = (gamesByState.get("archived") ?? []).length;

  return html`
    ${warning}
    ${gamesByState.has("pending") &&
    html`
      <h2>Pending</h2>
      <ul>
        ${gamesByState.get("pending").map((game) => html`<li><${GameLink} game=${game} /></li>`)}
      </ul>
    `}
    ${gamesByState.has("live") &&
    html`
      <h2>Live</h2>
      <ul>
        ${gamesByState.get("live").map((game) => html`<li><${GameLink} game=${game} /></li>`)}
      </ul>
    `}
    ${gamesByState.has("finished") &&
    html`
      <h2>Finished</h2>
      <ul>
        ${gamesByState.get("finished").map((game) => html`<li><${GameLink} game=${game} /></li>`)}
      </ul>
    `}
    ${numArchived > 0 &&
    html`
      <hr />
      <p>
        There ${numArchived == 1 ? "is" : "are"} ${numArchived} archived
        ${" "}${numArchived == 1 ? "game" : "games"}.
      </p>
    `}
  `;
}

function GameLink({ game }) {
  const { data: fullGame, error } = useApi(`/api/game/${game.name}`);

  return html`
    <${Link} href=${`/g/${game.name}`}>
      <div class="swatch" style=${{ background: game.color }} />
      ${game.name}
    <//>
    ${game.state == "live" && fullGame && html` - ${fullGame.currentPlayer}'s turn`}
    ${game.state == "finished" && fullGame && html` - ${fullGame.winner} won`}
    ${error && html`<span class="error">Error: ${error.toString()}</span>`}
  `;
}
