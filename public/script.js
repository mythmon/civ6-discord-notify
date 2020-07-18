import {
  html,
  render,
  useState,
  Link,
  Route as _Route,
  Switch,
  useSWR,
  SWRConfig,
  useRoute
} from "https://unpkg.com/swree?module";

function App() {
  return html`
    <h1>Games</h1>

    <${Switch}>
      <${Route} path="/"><${GamesList} /><//>
      <${Route} path="/g/:name" component=${GameDetail}><//>
    <//>
  `;
}

function Route({ path, component, children }) {
  console.log({path,component,children})
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
  return useSWR(key, fetcher, { refreshInterval: 60000 });
}

async function fetcher(key) {
  const res = await fetch(key);
  return res.json();
}

function GamesList() {
  const { data: games, error } = useApi("/api/game");

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
        game => html`
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
  return "details for game " + name;
}

render(App(), document.querySelector("#target"));
