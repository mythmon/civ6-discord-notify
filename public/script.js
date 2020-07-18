import { h, render} from "https://cdn.pika.dev/preact@^10.4.4";
import htm from "https://cdn.pika.dev/htm@^3.0.4";
import wouter from 'https://cdn.pika.dev/wouter-preact@^2.4.0';

const html = htm.bind(h);

function App() {
  
  return html`
    <h1>Hello, Preact!</h1>
    <p>From htm, with love</p>
  `;
}

render(App(), document.querySelector('#target'));