import { useAppStore } from "@/store/useAppStore";
import { Component, type ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    const ms = useAppStore.getState().locale === "ms";
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <div className="card p-7" role="alert">
          <h1>
            {ms
              ? "Paparan tidak dapat dimuatkan"
              : "The application could not display this page"}
          </h1>
          <p>
            {ms ? "Muat semula untuk mencuba lagi." : "Reload to try again."}
          </p>
          <button
            className="btn-primary mt-4"
            onClick={() => window.location.reload()}
          >
            {ms ? "Muat semula" : "Reload"}
          </button>
        </div>
      </main>
    );
  }
}
