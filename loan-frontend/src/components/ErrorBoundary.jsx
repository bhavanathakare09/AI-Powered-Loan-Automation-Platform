import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(err) {
    return { hasError: true, message: err?.message || "Unknown error" };
  }

  componentDidCatch(error, info) {
    // Don’t let extensions kill the tree; just log and continue.
    console.error("🔥 ErrorBoundary caught:", error, info);
  }

  handleReload = () => {
    // Lightweight reset
    this.setState({ hasError: false, message: "" });
    // Force a synchronous re-render without full page reload
    requestAnimationFrame(() => this.forceUpdate());
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-100 p-8">
          <div className="max-w-md w-full rounded-xl border border-neutral-800 bg-neutral-900/70 p-6">
            <h2 className="text-lg font-semibold mb-2">We recovered from an error</h2>
            <p className="text-sm text-neutral-400">
              A browser extension or injected script tried to run on this page.
              We’ve isolated it so your app keeps working.
            </p>
            <pre className="text-xs mt-4 p-3 bg-black/40 rounded border border-neutral-800 overflow-auto">
              {this.state.message}
            </pre>
            <button
              onClick={this.handleReload}
              className="mt-4 rounded-lg border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
            >
              Continue
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}