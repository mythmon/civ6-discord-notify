import { html } from "/deps/htm.js";

import { FontAwesomeIcon } from "https://cdn.skypack.dev/@fortawesome/react-fontawesome@^0.1.11";
import * as brands from "https://cdn.skypack.dev/@fortawesome/free-brands-svg-icons@^5.14.0";

const Icon = ({ icon, ...rest }) => {
  if (!icon.startsWith("fa")) {
    icon = "fa" + icon.slice(0, 1).toUpperCase() + icon.slice(1);
  }
  return html`<${FontAwesomeIcon} icon=${brands[icon]} ...${rest} />`;
};

export default Icon;
