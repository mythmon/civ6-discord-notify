import { h,  html, render, useState, Link, Route, Switch } from "https://unpkg.com/swree?module";

function App() {
  console.log(Link, Route, Switch);
  return html`
    <div>
      <h1>Hello, Preact!</h1>
      <p>From htm, with love</p>

      <!--- <${Switch}> --->
        <${Route} path="/"><${GamesList} /><//>
      <!--- <//> --->
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

render(App(), document.querySelector("#target"));
