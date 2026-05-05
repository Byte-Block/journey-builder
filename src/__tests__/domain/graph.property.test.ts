import {
  buildAncestorIndex,
  getDirectAncestors,
  getTransitiveAncestors,
  topologicalSort,
} from "@/domain/graph";
import type { Graph, GraphNode } from "@/domain/types";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { makeNode } from "./helpers";

// Append a single ID to a node's prerequisites; returns a fresh node.
const addPrereq = (n: GraphNode, extra: string): GraphNode => ({
  ...n,
  data: { ...n.data, prerequisites: [...n.data.prerequisites, extra] },
});

// Random DAG: n nodes, each node-i's prerequisites are a random subset of
// {node-0, ..., node-(i-1)}. Edges go from lower to higher index, so the
// result is acyclic by construction.
const arbitraryDag = fc.integer({ min: 0, max: 20 }).chain((n) => {
  const nodeIds = Array.from({ length: n }, (_, i) => `node-${i}`);

  return fc
    .tuple(...nodeIds.map((_, i) => fc.subarray(nodeIds.slice(0, i))))
    .map((prereqArrays): Graph => {
      const prereqs = (i: number): string[] => prereqArrays[i] ?? [];

      return {
        tenant_id: "test",
        nodes: nodeIds.map((id, i) => makeNode(id, prereqs(i))),
        edges: nodeIds.flatMap((id, i) => prereqs(i).map((p) => ({ source: p, target: id }))),
        forms: [],
        branches: [],
        triggers: [],
      };
    });
});

// Cyclic graph: take a DAG with ≥ 2 nodes, force a 2-cycle between node-0 and node-1.
const arbitraryCyclic = arbitraryDag
  .filter((g) => g.nodes.length >= 2)
  .map((dag): Graph => {
    const a = dag.nodes[0]?.id;
    const b = dag.nodes[1]?.id;

    if (!a || !b) {
      return dag;
    }

    return {
      ...dag,
      nodes: dag.nodes.map((n) => {
        if (n.id === a) {
          return addPrereq(n, b);
        }
        if (n.id === b) {
          return addPrereq(n, a);
        }
        return n;
      }),
    };
  });

describe("DAG invariants (property-based)", () => {
  it("Transitive ancestors never contain the node itself", () =>
    fc.assert(
      fc.property(arbitraryDag, (graph) => {
        for (const node of graph.nodes) {
          expect(getTransitiveAncestors(node.id, graph).has(node.id)).toBe(false);
        }
      }),
    ));

  it("Direct ancestors are a subset of transitive", () =>
    fc.assert(
      fc.property(arbitraryDag, (graph) => {
        for (const node of graph.nodes) {
          const direct = getDirectAncestors(node.id, graph);
          const transitive = getTransitiveAncestors(node.id, graph);
          for (const a of direct) {
            expect(transitive.has(a)).toBe(true);
          }
        }
      }),
    ));

  it("Topological sort produces a valid linearization for any DAG", () =>
    fc.assert(
      fc.property(arbitraryDag, (graph) => {
        const order = topologicalSort(graph);

        expect(order).not.toBeNull();
        if (!order) {
          return;
        }

        for (const node of graph.nodes) {
          const nodeIndex = order.indexOf(node.id);
          for (const prereq of node.data.prerequisites) {
            expect(order.indexOf(prereq)).toBeLessThan(nodeIndex);
          }
        }
      }),
    ));

  it("Topological sort returns null for any cyclic graph", () =>
    fc.assert(
      fc.property(arbitraryCyclic, (graph) => {
        expect(topologicalSort(graph)).toBeNull();
      }),
    ));

  it("Ancestor index matches the standalone helpers", () =>
    fc.assert(
      fc.property(arbitraryDag, (graph) => {
        const index = buildAncestorIndex(graph);

        for (const node of graph.nodes) {
          const entry = index.get(node.id);

          expect(entry).toBeDefined();
          expect(entry?.direct).toEqual(getDirectAncestors(node.id, graph));
          expect(entry?.transitive).toEqual(getTransitiveAncestors(node.id, graph));
        }
      }),
    ));
});
