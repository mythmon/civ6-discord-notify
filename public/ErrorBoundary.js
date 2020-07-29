import React from "/deps/react.js";
import { html } from "/deps/htm.js";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return html`
        <h1>Something went wrong.</h1>
        <p>${this.state.error.toString()}</p>
      `;
    }
    return this.props.children;
  }
}
