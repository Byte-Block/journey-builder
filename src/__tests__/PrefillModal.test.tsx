import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider, createStore } from "jotai";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PrefillModal } from "@/components/PrefillModal";
import { buildAncestorIndex } from "@/domain/graph";
import { buildLookups } from "@/domain/lookups";
import { GraphSchema } from "@/domain/schema";
import type { MappingMap } from "@/domain/types";
import { fieldMappingFamily, mappingsAtom } from "@/state/atoms";

import mockGraphJson from "./fixtures/graph.json";
import { nodeFinder } from "./helpers";

const graph = GraphSchema.parse(mockGraphJson);
const lookups = buildLookups(graph);
const ancestors = buildAncestorIndex(graph);
const { idByName } = nodeFinder(graph);

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

const renderModal = (override: Partial<Parameters<typeof PrefillModal>[0]> = {}) => {
  const formDId = idByName("Form D");
  const defaultProps: Parameters<typeof PrefillModal>[0] = {
    open: true,
    onOpenChange: () => {},
    graph,
    lookups,
    ancestors,
    targetNodeId: formDId,
    fieldKey: "email",
  };
  const store = createStore();
  return {
    store,
    ...render(
      <Provider store={store}>
        <PrefillModal {...defaultProps} {...override} />
      </Provider>,
    ),
  };
};

describe("PrefillModal", () => {
  it("Renders the four expected source groups when opened for Form D", async () => {
    renderModal();

    // Tree populates async — wait for the first group to appear.
    await screen.findByText("Action Properties");

    expect(screen.getByText("Action Properties")).toBeInTheDocument();
    expect(screen.getByText("Client Organisation Properties")).toBeInTheDocument();
    expect(screen.getByText("Form A")).toBeInTheDocument();
    expect(screen.getByText("Form B")).toBeInTheDocument();

    // Each top-level group label must be unique — direct vs. transitive should
    // never both surface the same upstream form.
    expect(screen.getAllByText("Form A")).toHaveLength(1);
    expect(screen.getAllByText("Form B")).toHaveLength(1);
  });

  it("Disables SELECT until a leaf is selected", () => {
    renderModal();

    expect(screen.getByRole("button", { name: "SELECT" })).toBeDisabled();
  });

  it("Writes the mapping and closes the modal when SELECT is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const formDId = idByName("Form D");
    const formBId = idByName("Form B");
    const { store } = renderModal({ onOpenChange });

    const formBSummary = await screen.findByText("Form B");
    const formBGroup = formBSummary.closest("details");
    if (!formBGroup) {
      throw new Error("Form B group not found");
    }
    await user.click(within(formBGroup).getByText("email"));

    const button = screen.getByRole("button", { name: "SELECT" });
    expect(button).toBeEnabled();
    await user.click(button);

    expect(store.get(fieldMappingFamily({ nodeId: formDId, fieldKey: "email" }))).toEqual({
      type: "form_field",
      nodeId: formBId,
      fieldKey: "email",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Disables SELECT with a circular-dependency tooltip when the proposed leaf would close a cycle", async () => {
    const user = userEvent.setup();
    const formDId = idByName("Form D");
    const formAId = idByName("Form A");

    // Pre-seed: Form A's email is prefilled FROM Form D's email.
    // Selecting Form A's email below proposes Form D's email being prefilled
    // FROM Form A's email — closing a cycle in the field-prefill graph.
    const seed: MappingMap = {
      [formAId]: {
        email: { type: "form_field", nodeId: formDId, fieldKey: "email" },
      },
    };
    const store = createStore();
    store.set(mappingsAtom, seed);

    render(
      <Provider store={store}>
        <PrefillModal
          open
          onOpenChange={() => {}}
          graph={graph}
          lookups={lookups}
          ancestors={ancestors}
          targetNodeId={formDId}
          fieldKey="email"
        />
      </Provider>,
    );

    const formASummary = await screen.findByText("Form A");
    const formAGroup = formASummary.closest("details");
    if (!formAGroup) {
      throw new Error("Form A group not found");
    }
    await user.click(within(formAGroup).getByText("email"));

    const button = screen.getByRole("button", { name: "SELECT" });
    expect(button).toBeDisabled();
    expect(button.getAttribute("title")).toMatch(/circular dependency/i);
  });
});
