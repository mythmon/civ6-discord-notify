import htm from "https://cdn.skypack.dev/htm@^3.0.4";

import React from "./react.js";

export default htm;

export const html = htm.bind(React.createElement);
