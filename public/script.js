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
          <${Suspense} fallback=${html`<div>...</div>`}>
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
        <li>...</li>
      </ul>
    `;
  }

  return html`
    <ul>
      ${games.map(
    (game) => html`
          <li>
            <${Link} href=${`/g/${game.name}`}>
              ${game.name}
            <//>
          </li>
        `
  )}
    </ul>
  `;
}
