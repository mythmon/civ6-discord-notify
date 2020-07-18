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
} from "https://unpkg.com/swree@1.1.0?module";
import * as dateFns from 'https://cdn.pika.dev/date-fns@^2.14.0';

function App() {
  return html`
    <h1>Civilization 6 Game Tracker</h1>

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
  const { data: detail, error } = useApi(`/api/game/${name}`);
  
  const header = html`<h2>Details for ${name}</h2>`;
  
  if (error) {
    return html`${header} <p>${error.toString()}</p>`;
  }
  
  if (!detail) {
   return html`${header} <p>...</p>`;
  }
  
  const {currentPlayer, turnNumber, lastUpdated, players} = detail;
  const lastUpdatedDisplay = new Date(lastUpdated).toLocaleString(navigator.locale, {timeZoneName: 'short', hour12: false});
  
  return html`
    ${header}
    <p>It's ${currentPlayer}'s ${toOrdinal(turnNumber)} turn.</p>
    <p>There are ${players.length} players:</p>
    <ul>${players.map((player) => html`<li>${player}</li>`)}</ul>
    <footer>
      Last updated at <${Time} datetime=${lastUpdated}/>
    </footer>
  `;
}

function toOrdinal(n) {
  const mod = n % 10;
  if (mod === 1 && n !== 11) {
    return `${n}st`;
  }
  if (mod === 2 && n !== 12) {
    return `${n}nd`;
  }
  if (mod === 3 && n !== 13) {
    return `${n}rd`;
  }
  return `${n}th`;
}

function Time({ datetime, options }) {
  if (typeof datetime == 'string') {
    const parsed = new Date(datetime);
    if (!isNaN(parsed)) {
      datetime = parsed;
    } else {
      return html`<time>${datetime}</time>`;
    }
  }
  const display = datetime.toLocaleString({ timeZoneName: 'short', hour12: false, ...options});
  return html`<time datetime=${datetime.toISOString()} title=${display}>${display}</time>`;
}

render(App(), document.querySelector("#target"));
