import * as htm from "https://cdn.pika.dev/htm@^3.0.4";
import * as createRouter from "https://cdn.pika.dev/router5@^7.0.2";
import * as browserRouter from "https://cdn.pika.dev/router5-plugin-browser@^7.0.2";

const router = createRouter();

router.usePlugin(browserRouter());

router.start();
