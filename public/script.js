import { html, render, useState, Link, Route, Switch, useSWR, SWRConfig } from "https://unpkg.com/swree?module";

function App() {
  return html`
    <h1>Games</h1>

    <${Switch}>
      <${Route} path="/"><${GamesList} /><//>
      <${Route} path="/g/:name"><${GameDetail} /><//>
    <//>
  `;
}

function useApi(key) {
  return useSWR(key, fetcher, { refreshInterval: 60000 });
}

async function fetcher(key) {
  const res = await fetch(key);
  return res.json();
}

function GamesList() {
  const { data: games, error } = useApi("/api/game");
  
  if (!games) {
    return html`<ul><li>...</li></ul>`;
  }
  
  return html`
    <ul>
      ${games.map((game) => html`
        <li>
          <${Link} href=${`/g/${game.gameName}`}>
            ${game.gameName}
          <//>
        </li>
      `)}
    </ul>
  `;
}

function GameDetail({ name }) {
  return "Details for game " + name;
}

render(App(), document.querySelector("#target"));
