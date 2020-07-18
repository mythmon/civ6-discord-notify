import { h, render } from "https://cdn.pika.dev/preact@^10.4.4/";
import { useState } from "https://cdn.pika.dev/preact@^10.4.4/hooks";
import htm from "https://cdn.pika.dev/htm@^3.0.5";
import { Link, Route, Switch } from "https://cdn.pika.dev/wouter-preact@^2.4.0";

const html = htm.bind(h);

function App() {
  return html`
    <div>
      <h1>Hello, Preact!</h1>
      <p>From htm, with love</p>

      <${Route} path="/"><${GamesList} /><//>
    </div>
  `;
}

function GamesList() {
  return html`
    <ul>
      <li>Games</li>
      <li>go</li>
      <li>here</li>
    </ul>
  `;
}

render(html`<${App}/>`, document.querySelector("#target"));
