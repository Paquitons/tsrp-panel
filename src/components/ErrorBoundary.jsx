import { Component } from "react";

/**
 * Root-level safety net -- without this, ANY uncaught render error
 * anywhere in the app (a bad prop, a malformed API response, whatever)
 * unmounts the entire React tree and leaves a blank page with no
 * indication anything went wrong. This at least shows a real message
 * and a way to recover, and is the reason a single bad row of data in
 * one panel can no longer take down the whole site.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Caught a render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="content" style={{ maxWidth: 640, margin: "80px auto" }}>
          <div className="card">
            <h1>Something went wrong</h1>
            <p className="muted">
              This page hit an unexpected error and couldn't render. Reloading usually fixes it --
              if it keeps happening, let a developer know what page you were on.
            </p>
            <button className="primary" style={{ marginTop: 16 }} onClick={() => window.location.reload()}>
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
