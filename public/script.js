import { html, render, useState, Link, Route, Switch, useSWR, SWRConfig } from "https://unpkg.com/swree?module";

function App() {
  return html`
    <${SWRConfig} value=${{
      refreshInterval: 30_000,
      fetch: (...args) => fetch(...args).then(res => res.json()),
    }}>
      <h1>Hello, Preact!</h1>
      <p>From htm, with love</p>

      <${Switch}>
        <${Route} path="/"><${GamesList} /><//>
      <//>
    </${SWRConfig}>
  `;
}

function GamesList() {
  const { data, error } = useSWR("/api/game", (args) => fetch(...args).then(res => res.json()));
  return html`
    <ul>
      <li>Games</li>
      <li>go</li>
      <li>here</li>
    </ul>
    <pre><code>${JSON.stringify({data, error}, null, 4)}</code></pre>
  `;
}

render(App(), document.querySelector("#target"));
