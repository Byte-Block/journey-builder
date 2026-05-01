import {
  buildAdjacency,
  CycleError,
  getDirectAncestors,
  getTransitiveAncestors,
  topologicalSort,
  validateAcyclic,
} from "@/domain/graph";
import { GraphSchema } from "@/domain/schema";
import type { Graph, GraphNode } from "@/domain/types";
import { describe, expect, it } from "vitest";
import mockGraphJson from "./fixtures/graph.json";

const mockGraph = GraphSchema.parse(mockGraphJson);
const idByName = new Map<string, string>(mockGraph.nodes.map((n) => [n.data.name, n.id]));

function nodeIdByName(name: string): string {
  const id = idByName.get(name);

  if (!id) {
    throw new Error(`Form "${name}" not found in fixture`);
  }

  return id;
}

// Construct a synthetic graph node for cycle / edge-case tests.
function makeNode(id: string, prerequisites: string[] = []): GraphNode {
  return {
    id,
    type: "form",
    position: { x: 0, y: 0 },
    hidden: false,
    data: {
      id,
      component_key: id,
      component_id: `f_${id}`,
      component_type: "form",
      name: id,
      prerequisites,
      permitted_roles: [],
      input_mapping: {},
    },
  };
}

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
