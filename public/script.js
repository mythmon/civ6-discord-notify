import { html, render, useState, Link, Route, Switch, useSWR, SWRConfig } from "https://unpkg.com/swree?module";

function App() {
  return html`
    <h1>Hello, Preact!</h1>
    <p>From htm, with love</p>

    <${Switch}>
      <${Route} path="/"><${GamesList} /><//>
    <//>
  `;
}

function useApi(key) {
  return useSWR(key, fetcher, { refreshInterval: 10000 });
}

async function fetcher(key) {
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log(`fetching ${key}`);
  const res = await fetch(key);
  return res.json();
}

function GamesList() {
  const { data, error } = ususeApiSWR("/api/game");
  return html`
    <ul>
      <li>Games</li>
      <li>go</li>
      <li>here</li>
    </ul>
    <pre><code>${JSON.stringify({data, error: error?.toString()}, null, 4)}</code></pre>
  `;
}

render(App(), document.querySelector("#target"));
