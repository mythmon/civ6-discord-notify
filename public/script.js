import htm from "https://cdn.pika.dev/htm@^3.0.4";
import { createRouter } from "https://cdn.pika.dev/router5@^7.0.2";
import browserRouter from "https://cdn.pika.dev/router5-plugin-browser@^7.0.2";

import listenersPlugin from "router5/plugins/listeners";
import browserPlugin from "router5/plugins/browser";

const routes = [
  {name: 'home', path: '/'},
  {name: 'game', path: '/g/:gameName'},
];

const router = createRouter();

router.usePlugin(browserRouter());

router.subscribe(({route, previousRoute}) => {
  console.log("navigated to", {route}, "from", {previousRoute});
})

router.start();
console.log(router.getState());
router.navigate("/");
console.log(router.getState());