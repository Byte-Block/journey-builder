import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ErrorBoundary", () => {
  it("Renders children when no error is thrown", () => {
    render(
      <ErrorBoundary>
        <p>healthy</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("healthy")).toBeInTheDocument();
  });

  it("Renders the default fallback when a child throws during render", () => {
    // React logs caught errors via console.error; silence so the test output
    // stays focused on the assertion, not on intentional noise.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Throws = () => {
      throw new Error("boom");
    };

    render(
      <ErrorBoundary>
        <Throws />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/boom/)).toBeInTheDocument();
  });
});
