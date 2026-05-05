import type { FormDef, Graph, GraphNode } from "./types";

export type GraphLookups = {
  nodesById: ReadonlyMap<string, GraphNode>;
  formsById: ReadonlyMap<string, FormDef>;
};

export const buildLookups = (graph: Graph): GraphLookups => ({
  nodesById: new Map(graph.nodes.map((n) => [n.id, n])),
  formsById: new Map(graph.forms.map((f) => [f.id, f])),
});
