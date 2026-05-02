"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type FallbackRender = (error: Error, retry: () => void) => ReactNode;

type Props = {
  fallback?: FallbackRender;
  children: ReactNode;
};

type State = { error: Error | null };

const defaultFallback: FallbackRender = (error, retry) => (
  <div role="alert">
    <h2>Something went wrong</h2>
    <p>{error.message}</p>
    <button type="button" onClick={retry}>
      Try again
    </button>
  </div>
);

// Hand-rolled React error boundary. Catches render-time errors in any
// descendant Client Component and renders the fallback. Sits inside layout.tsx
// as the inner net; app/error.tsx is the outer net catching RSC throws.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, info);
  }

  retry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    const { fallback = defaultFallback, children } = this.props;
    if (error == null) {
      return children;
    }
    return fallback(error, this.retry);
  }
}
