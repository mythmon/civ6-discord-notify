import { useState, useEffect, useCallback } from "/deps/react.js";
import { html } from "/deps/htm.js";
import Icon from "/deps/fontawesome.js";
import { mutate } from "/deps/swr.js";

import { useApi } from "/api.js";

export const AuthIcon = () => {
  return html`<div class="auth-ui"><${AuthState} /> <${Icon} icon="discord" size="lg" /></div>`;
};

const AuthState = () => {
  const { auth, authError } = useAuth();
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    let timeoutId = setTimeout(() => setHasTimedOut(true), 100);
    return () => clearTimeout(timeoutId);
  }, []);

  const login = useCallback(() => {
    window.open("/auth/discord", "Civ Tracker Auth", "width=500,height=800,toolbar=0");
  }, []);

  useEffect(() => {
    const listener = (e) => {
      console.log("Got message from window", e);
      if (e.data === "auth-popup-success" || e.data == "auth-popup-failure") {
        // retrigger useApi
        mutate("/api/whoami");
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  if (authError) {
    console.error(authError);
    return html`<span>Error</span>`;
  }

  if (!auth) {
    if (hasTimedOut) {
      return "...";
    } else {
      return null;
    }
  }

  if (auth && auth.user) {
    return html`<span>${auth.user.username}</span>`;
  }

  if (auth && !auth.user) {
    return html`<button onClick=${login}>Login</button>`;
  }

  throw new Error("bug");
};

export const useAuth = () => {
  const { data: auth, error: authError } = useApi(`/api/whoami`);
  return { auth, authError };
};
