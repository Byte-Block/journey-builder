"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { ErrorFallback } from "./ErrorFallback";

type FallbackRender = (error: Error, retry: () => void) => ReactNode;

type Props = {
  fallback?: FallbackRender;
  children: ReactNode;
};

type State = { error: Error | null };

const defaultFallback: FallbackRender = (error, retry) => (
  <ErrorFallback error={error} retry={retry} />
);

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
