import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { DataSourceTree } from "@/components/DataSourceTree";
import type { DataNode } from "@/data-sources/types";

const sampleTree: readonly DataNode[] = [
  {
    kind: "group",
    id: "form-a",
    label: "Form A",
    children: [
      {
        kind: "leaf",
        id: "form-a:email",
        label: "email",
        ref: { type: "form_field", nodeId: "a", fieldKey: "email" },
      },
      {
        kind: "leaf",
        id: "form-a:name",
        label: "name",
        ref: { type: "form_field", nodeId: "a", fieldKey: "name" },
      },
    ],
  },
  {
    kind: "group",
    id: "globals",
    label: "Globals",
    children: [
      {
        kind: "group",
        id: "globals:nested",
        label: "Nested Group",
        children: [
          {
            kind: "leaf",
            id: "deep-leaf",
            label: "deep",
            ref: { type: "global", scope: "action", key: "id" },
          },
        ],
      },
    ],
  },
];

describe("DataSourceTree", () => {
  it("Renders all top-level groups and their leaf labels", () => {
    render(<DataSourceTree tree={sampleTree} selectedLeafId={null} onSelectLeaf={() => {}} />);

    expect(screen.getByText("Form A")).toBeInTheDocument();
    expect(screen.getByText("Globals")).toBeInTheDocument();
    expect(screen.getByText("email")).toBeInTheDocument();
    expect(screen.getByText("name")).toBeInTheDocument();
  });

  it("Toggles the <details> open attribute when summary is clicked", async () => {
    const user = userEvent.setup();
    render(<DataSourceTree tree={sampleTree} selectedLeafId={null} onSelectLeaf={() => {}} />);

    const formA = screen.getByText("Form A").closest("details");
    expect(formA).not.toHaveAttribute("open");

    await user.click(screen.getByText("Form A"));
    expect(formA).toHaveAttribute("open");

    await user.click(screen.getByText("Form A"));
    expect(formA).not.toHaveAttribute("open");
  });

  it("Calls onSelectLeaf with the full leaf node when a leaf is clicked", async () => {
    const user = userEvent.setup();
    let selected: DataNode | null = null;

    render(
      <DataSourceTree
        tree={sampleTree}
        selectedLeafId={null}
        onSelectLeaf={(leaf) => {
          selected = leaf;
        }}
      />,
    );

    await user.click(screen.getByText("email"));

    expect(selected).toEqual({
      kind: "leaf",
      id: "form-a:email",
      label: "email",
      ref: { type: "form_field", nodeId: "a", fieldKey: "email" },
    });
  });

  it("Reflects selectedLeafId via aria-pressed on the matching leaf", () => {
    render(
      <DataSourceTree tree={sampleTree} selectedLeafId="form-a:email" onSelectLeaf={() => {}} />,
    );

    const emailLeaf = screen.getByText("email").closest("button");
    expect(emailLeaf).toHaveAttribute("aria-pressed", "true");

    const nameLeaf = screen.getByText("name").closest("button");
    expect(nameLeaf).toHaveAttribute("aria-pressed", "false");
  });

  it("Renders nested groups recursively without leaking source-specific knowledge", () => {
    render(<DataSourceTree tree={sampleTree} selectedLeafId={null} onSelectLeaf={() => {}} />);

    // <details> children stay in the DOM even when collapsed; getByText finds
    // them via text content regardless of visibility — proves the recursive
    // renderer reaches arbitrary depth.
    expect(screen.getByText("Nested Group")).toBeInTheDocument();
    expect(screen.getByText("deep")).toBeInTheDocument();
  });

  it("Has no axe violations on the rendered tree", async () => {
    const { container } = render(
      <DataSourceTree tree={sampleTree} selectedLeafId="form-a:email" onSelectLeaf={() => {}} />,
    );

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });
});
