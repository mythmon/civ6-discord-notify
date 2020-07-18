import { h, render } from "https://cdn.pika.dev/preact@^10.0.5/";
import { useState } from "https://cdn.pika.dev/preact@^10.0.5/hooks";
import htm from "https://cdn.pika.dev/htm@^2.2.1";
import { Link, Route, Switch } from "https://cdn.pika.dev/wouter-preact@^2.4.0";

const html = htm.bind(h);

function App() {
  console.log(Link, Route, Switch);
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

render(h(App), document.querySelector("#target"));
