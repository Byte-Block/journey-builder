import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FormList } from "@/components/FormList";
import { GraphSchema } from "@/domain/schema";
import type { Graph, GraphNode } from "@/domain/types";

import mockGraphJson from "./fixtures/graph.json";
import { makeNode, nodeFinder } from "./helpers";

const graph = GraphSchema.parse(mockGraphJson);
const { idByName } = nodeFinder(graph);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FormList", () => {
  it("Renders all forms in topological order with A first and F last", () => {
    render(<FormList graph={graph} selectedNodeId={null} onSelect={() => {}} />);

    const labels = screen.getAllByRole("option").map((el) => el.textContent);

    expect(labels).toHaveLength(6);
    expect(labels[0]).toBe("Form A");
    expect(labels[5]).toBe("Form F");
    expect(labels.indexOf("Form B")).toBeLessThan(labels.indexOf("Form D"));
    expect(labels.indexOf("Form C")).toBeLessThan(labels.indexOf("Form E"));
  });

  it("Reflects selectedNodeId via aria-selected on the matching row", () => {
    render(<FormList graph={graph} selectedNodeId={idByName("Form A")} onSelect={() => {}} />);

    const row = screen.getByText("Form A").closest('[role="option"]');
    expect(row).toHaveAttribute("aria-selected", "true");
  });

  it("Calls onSelect with the node id when a row is clicked", async () => {
    const user = userEvent.setup();
    let selected: string | null = null;

    render(
      <FormList
        graph={graph}
        selectedNodeId={null}
        onSelect={(id) => {
          selected = id;
        }}
      />,
    );

    await user.click(screen.getByText("Form A"));

    expect(selected).toBe(idByName("Form A"));
  });

  it("Activates the focused option on Enter and Space", async () => {
    const user = userEvent.setup();
    const selections: string[] = [];

    render(<FormList graph={graph} selectedNodeId={null} onSelect={(id) => selections.push(id)} />);

    // First option (Form A) is the initial focused option (roving tabindex).
    await user.tab();
    await user.keyboard("{Enter}");
    expect(selections).toEqual([idByName("Form A")]);

    await user.keyboard(" ");
    expect(selections).toEqual([idByName("Form A"), idByName("Form A")]);
  });

  it("Moves focus through options with ArrowDown / ArrowUp / Home / End", async () => {
    const user = userEvent.setup();
    const selections: string[] = [];

    render(<FormList graph={graph} selectedNodeId={null} onSelect={(id) => selections.push(id)} />);

    // Capture the actual rendered order so navigation assertions don't depend
    // on tie-breaking between same-depth peers (B vs C, D vs E) — Kahn's
    // produces one valid topo order; both orderings are correct.
    const orderedIds = screen.getAllByRole("option").map((el) => idByName(el.textContent ?? ""));

    await user.tab(); // focus first
    await user.keyboard("{ArrowDown}{Enter}"); // → 2nd
    expect(selections.at(-1)).toBe(orderedIds[1]);

    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}"); // → 4th
    expect(selections.at(-1)).toBe(orderedIds[3]);

    await user.keyboard("{ArrowUp}{Enter}"); // → 3rd (4th's predecessor)
    expect(selections.at(-1)).toBe(orderedIds[2]);

    await user.keyboard("{End}{Enter}"); // → last
    expect(selections.at(-1)).toBe(orderedIds[5]);

    await user.keyboard("{Home}{Enter}"); // → first
    expect(selections.at(-1)).toBe(orderedIds[0]);
  });

  it("Skips non-form nodes and warns once per unique node id", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const branchNode: GraphNode = {
      id: "branch-1",
      type: "branch",
      position: { x: 0, y: 0 },
      hidden: false,
      data: {
        id: "branch-1",
        component_key: "branch-1",
        component_id: "b_branch-1",
        component_type: "branch",
        name: "Some Branch",
        prerequisites: [],
        permitted_roles: [],
        input_mapping: {},
      },
    };
    const synthetic: Graph = {
      tenant_id: "test",
      nodes: [makeNode("A"), branchNode, makeNode("B", ["A"])],
      edges: [],
      forms: [],
      branches: [],
      triggers: [],
    };

    const { rerender } = render(
      <FormList graph={synthetic} selectedNodeId={null} onSelect={() => {}} />,
    );

    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("skipping non-form node branch-1"));

    // Re-render with the same synthetic graph: Set must dedupe the warn.
    const callsAfterFirst = warn.mock.calls.length;
    rerender(<FormList graph={synthetic} selectedNodeId={null} onSelect={() => {}} />);
    expect(warn.mock.calls.length).toBe(callsAfterFirst);
  });

  it("Falls back to insertion order and warns when topologicalSort returns null", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    // 2-node cycle (A → B → A) — topologicalSort returns null.
    const cyclic: Graph = {
      tenant_id: "test",
      nodes: [makeNode("A", ["B"]), makeNode("B", ["A"])],
      edges: [],
      forms: [],
      branches: [],
      triggers: [],
    };

    render(<FormList graph={cyclic} selectedNodeId={null} onSelect={() => {}} />);

    const labels = screen.getAllByRole("option").map((el) => el.textContent);
    expect(labels).toEqual(["A", "B"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("topologicalSort returned null"));
  });
});
