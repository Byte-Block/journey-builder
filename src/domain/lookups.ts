import type { FormDef, Graph, GraphNode } from "./types";

// O(1) lookups by id for nodes and forms. Same shape consumed by
// DataSourceContext, cleanupOrphans, and any test that needs to resolve
// fixture nodes. Build once per graph load, share everywhere.
export type GraphLookups = {
  nodesById: ReadonlyMap<string, GraphNode>;
  formsById: ReadonlyMap<string, FormDef>;
};

export const buildLookups = (graph: Graph): GraphLookups => ({
  nodesById: new Map(graph.nodes.map((n) => [n.id, n])),
  formsById: new Map(graph.forms.map((f) => [f.id, f])),
});
