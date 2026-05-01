import type { Graph } from "./types";

// Map of parent node ID → set of children that depend on it.
export type Adjacency = ReadonlyMap<string, ReadonlySet<string>>;

// Forward-direction adjacency (parent → children) for the DAG.
export function buildAdjacency(graph: Graph): Adjacency {
  const adj = new Map<string, Set<string>>();

  // Seed every node so leaf nodes (no children) still appear in the map.
  for (const node of graph.nodes) {
    adj.set(node.id, new Set());
  }

  // Each node's prerequisites are its parents; record the parent → child edge.
  for (const node of graph.nodes) {
    for (const parent of node.data.prerequisites) {
      const children = adj.get(parent);
      if (!children) {
        throw new Error(`Node ${node.id} references missing prerequisite: ${parent}`);
      }
      children.add(node.id);
    }
  }

  return adj;
}

// Direct upstream nodes (the prerequisites listed on the node).
export function getDirectAncestors(nodeId: string, graph: Graph): ReadonlySet<string> {
  const node = graph.nodes.find((n) => n.id === nodeId);

  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  return new Set(node.data.prerequisites);
}
