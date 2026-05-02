import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Modal } from "@/components/Modal";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Modal", () => {
  it("Renders title and children when open", () => {
    render(
      <Modal open onOpenChange={() => {}} title="Test modal">
        <p>Body content</p>
      </Modal>,
    );

    expect(screen.getByText("Test modal")).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("Renders nothing when closed", () => {
    render(
      <Modal open={false} onOpenChange={() => {}} title="Test modal">
        <p>Body content</p>
      </Modal>,
    );

    expect(screen.queryByText("Test modal")).not.toBeInTheDocument();
    expect(screen.queryByText("Body content")).not.toBeInTheDocument();
  });

  it("Renders description when provided", () => {
    render(
      <Modal open onOpenChange={() => {}} title="Test modal" description="Choose an option">
        <p>Body content</p>
      </Modal>,
    );

    expect(screen.getByText("Choose an option")).toBeInTheDocument();
  });

  it("Calls onOpenChange(false) when Escape is pressed", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(
      <Modal open onOpenChange={handler} title="Test modal">
        <p>Body content</p>
      </Modal>,
    );

    await user.keyboard("{Escape}");

    expect(handler).toHaveBeenCalledWith(false);
  });

  it("Calls onOpenChange(false) when the overlay is clicked", async () => {
    // pointerEventsCheck: 0 bypasses userEvent's pointer-events:none guard,
    // which trips on Radix's hidden focus-scope wrappers in jsdom even though
    // the target overlay itself accepts pointer events.
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const handler = vi.fn();
    render(
      <Modal open onOpenChange={handler} title="Test modal">
        <p>Body content</p>
      </Modal>,
    );

    // Radix's outside-close listens on the dismissable layer for pointer
    // events outside Dialog.Content. The overlay is the canonical outside
    // target — userEvent.click fires the full pointer+mouse sequence.
    const dialog = screen.getByRole("dialog");
    const portalRoot = dialog.parentElement;
    if (!portalRoot) {
      throw new Error("Radix portal root not found");
    }
    const overlay = Array.from(portalRoot.children).find((el) => el !== dialog) as
      | HTMLElement
      | undefined;
    if (!overlay) {
      throw new Error("Overlay element not found");
    }
    await user.click(overlay);

    expect(handler).toHaveBeenCalledWith(false);
  });

  it("Moves initial focus into the dialog subtree", async () => {
    render(
      <Modal open onOpenChange={() => {}} title="Test modal">
        <button type="button">Inside button</button>
      </Modal>,
    );

    // Radix moves focus to the dialog content (or its first focusable child)
    // on mount. The exact target is implementation-detail; assert containment.
    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(dialog.contains(document.activeElement)).toBe(true);
    });
  });

  it("Has no axe violations on the rendered shell", async () => {
    render(
      <Modal open onOpenChange={() => {}} title="Test modal" description="Helps screen readers">
        <p>Body content</p>
      </Modal>,
    );

    // Radix portals content to document.body, outside the test container.
    const results = await axe(document.body);

    expect(results).toHaveNoViolations();
  });
});
