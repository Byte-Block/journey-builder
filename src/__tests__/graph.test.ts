import {
  assertEdgesMatchPrerequisites,
  buildAdjacency,
  buildAncestorIndex,
  CycleError,
  getDirectAncestors,
  getTransitiveAncestors,
  topologicalSort,
  topologicalSortItems,
  validateAcyclic,
} from "@/domain/graph";
import { GraphSchema } from "@/domain/schema";
import type { Graph } from "@/domain/types";
import { describe, expect, it } from "vitest";
import mockGraphJson from "./fixtures/graph.json";
import { makeNode, nodeFinder } from "./helpers";

const mockGraph = GraphSchema.parse(mockGraphJson);
const { idByName: nodeIdByName } = nodeFinder(mockGraph);

// 2-node cycle (A → B → A) for cycle-detection tests.
const cyclicGraph: Graph = {
  tenant_id: "test",
  nodes: [makeNode("A", ["B"]), makeNode("B", ["A"])],
  edges: [],
  forms: [],
  branches: [],
  triggers: [],
};

describe("getDirectAncestors", () => {
  it.each<[string, string[]]>([
    ["Form A", []],
    ["Form B", ["Form A"]],
    ["Form C", ["Form A"]],
    ["Form D", ["Form B"]],
    ["Form E", ["Form C"]],
    ["Form F", ["Form D", "Form E"]],
  ])("%s has direct ancestors %j", (name, expectedNames) => {
    const id = nodeIdByName(name);
    const expected = new Set(expectedNames.map(nodeIdByName));

    expect(getDirectAncestors(id, mockGraph)).toEqual(expected);
  });

  it("Throws for an unknown node id", () =>
    expect(() => getDirectAncestors("nonexistent-id", mockGraph)).toThrow(/Node not found/));
});

describe("buildAdjacency", () => {
  const adj = buildAdjacency(mockGraph);

  it.each<[string, string[]]>([
    ["Form A", ["Form B", "Form C"]],
    ["Form B", ["Form D"]],
    ["Form C", ["Form E"]],
    ["Form D", ["Form F"]],
    ["Form E", ["Form F"]],
    ["Form F", []],
  ])("%s has children %j", (name, expectedChildNames) => {
    const id = nodeIdByName(name);
    const expected = new Set(expectedChildNames.map(nodeIdByName));

    expect(adj.get(id)).toEqual(expected);
  });

  it("Throws when a node references a prerequisite that isn't in the graph", () => {
    const broken: Graph = {
      tenant_id: "test",
      nodes: [makeNode("A", ["ghost"])],
      edges: [],
      forms: [],
      branches: [],
      triggers: [],
    };

    expect(() => buildAdjacency(broken)).toThrow(/missing prerequisite: ghost/);
  });
});

describe("topologicalSortItems", () => {
  it("Returns parents before children for a generic item list", () => {
    const order = topologicalSortItems([
      { id: "a", prerequisites: [] },
      { id: "b", prerequisites: ["a"] },
      { id: "c", prerequisites: ["b"] },
    ]);

    expect(order).toEqual(["a", "b", "c"]);
  });

  it("Returns null when the item list is cyclic", () => {
    const order = topologicalSortItems([
      { id: "a", prerequisites: ["b"] },
      { id: "b", prerequisites: ["a"] },
    ]);

    expect(order).toBeNull();
  });

  it("Throws when an item references a prerequisite that isn't in the list", () => 
    expect(() => topologicalSortItems([{ id: "a", prerequisites: ["ghost"] }])).toThrow(
      /missing prerequisite: ghost/,
    )
  );
});

describe("getTransitiveAncestors", () => {
  it.each<[string, string[]]>([
    ["Form A", []],
    ["Form B", ["Form A"]],
    ["Form C", ["Form A"]],
    ["Form D", ["Form A", "Form B"]],
    ["Form E", ["Form A", "Form C"]],
    ["Form F", ["Form A", "Form B", "Form C", "Form D", "Form E"]],
  ])("%s has transitive ancestors %j", (name, expectedNames) => {
    const id = nodeIdByName(name);
    const expected = new Set(expectedNames.map(nodeIdByName));

    expect(getTransitiveAncestors(id, mockGraph)).toEqual(expected);
  });

  it("Form F sees Form A exactly once despite the diamond (two paths)", () => {
    const F = nodeIdByName("Form F");
    const A = nodeIdByName("Form A");
    const ancestors = getTransitiveAncestors(F, mockGraph);

    expect(ancestors.has(A)).toBe(true);
    expect(ancestors.size).toBe(5);
  });
});

describe("topologicalSort", () => {
  it("Returns parents before children for the mock graph", () => {
    const order = topologicalSort(mockGraph);

    expect(order).not.toBeNull();

    if (!order) {
      return;
    }

    for (const node of mockGraph.nodes) {
      const nodeIndex = order.indexOf(node.id);
      for (const prereq of node.data.prerequisites) {
        const prereqIndex = order.indexOf(prereq);
        expect(prereqIndex).toBeLessThan(nodeIndex);
      }
    }
  });

  it("Returns Form A first (only root)", () => {
    const order = topologicalSort(mockGraph);

    expect(order).not.toBeNull();
    expect(order?.[0]).toBe(nodeIdByName("Form A"));
  });

  it("Returns Form F last (only sink)", () => {
    const order = topologicalSort(mockGraph);

    expect(order).not.toBeNull();
    expect(order?.[order.length - 1]).toBe(nodeIdByName("Form F"));
  });

  it("Returns null on a cyclic graph", () => expect(topologicalSort(cyclicGraph)).toBeNull());
});

describe("validateAcyclic", () => {
  it("Does not throw on the valid mock graph", () =>
    expect(() => validateAcyclic(mockGraph)).not.toThrow());

  it("Throws CycleError on a cyclic graph", () =>
    expect(() => validateAcyclic(cyclicGraph)).toThrow(CycleError));

  it("CycleError lists the participating nodes", () => {
    try {
      validateAcyclic(cyclicGraph);
      throw new Error("expected validateAcyclic to throw");
    } catch (e) {
      expect(e).toBeInstanceOf(CycleError);
      if (e instanceof CycleError) {
        expect(e.cycleNodes).toContain("A");
        expect(e.cycleNodes).toContain("B");
      }
    }
  });
});

describe("buildAncestorIndex", () => {
  const index = buildAncestorIndex(mockGraph);

  it.each<[string, string[], string[]]>([
    ["Form A", [], []],
    ["Form B", ["Form A"], ["Form A"]],
    ["Form C", ["Form A"], ["Form A"]],
    ["Form D", ["Form B"], ["Form A", "Form B"]],
    ["Form E", ["Form C"], ["Form A", "Form C"]],
    ["Form F", ["Form D", "Form E"], ["Form A", "Form B", "Form C", "Form D", "Form E"]],
  ])("%s has direct=%j and transitive=%j", (name, directNames, transitiveNames) => {
    const id = nodeIdByName(name);
    const entry = index.get(id);

    expect(entry).toBeDefined();
    expect(entry?.direct).toEqual(new Set(directNames.map(nodeIdByName)));
    expect(entry?.transitive).toEqual(new Set(transitiveNames.map(nodeIdByName)));
  });

  it("Index agrees with the standalone helpers for every node", () => {
    for (const node of mockGraph.nodes) {
      const entry = index.get(node.id);

      expect(entry?.direct).toEqual(getDirectAncestors(node.id, mockGraph));
      expect(entry?.transitive).toEqual(getTransitiveAncestors(node.id, mockGraph));
    }
  });

  it("Throws CycleError on a cyclic graph", () =>
    expect(() => buildAncestorIndex(cyclicGraph)).toThrow(CycleError));
});

describe("assertEdgesMatchPrerequisites", () => {
  it("Does not throw on the valid mock graph", () =>
    expect(() => assertEdgesMatchPrerequisites(mockGraph)).not.toThrow());

  it("Throws when edges[] has an entry that prerequisites doesn't", () => {
    const inconsistent: Graph = {
      ...mockGraph,
      edges: [...mockGraph.edges, { source: "form-fake", target: "form-also-fake" }],
    };

    expect(() => assertEdgesMatchPrerequisites(inconsistent)).toThrow(/disagree/);
  });

  it("Throws when prerequisites has an edge that edges[] doesn't", () => {
    const inconsistent: Graph = {
      ...mockGraph,
      edges: [],
    };

    expect(() => assertEdgesMatchPrerequisites(inconsistent)).toThrow(/disagree/);
  });
});
