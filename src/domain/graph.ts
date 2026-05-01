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

// All upstream nodes reachable from this one (transitive closure of prerequisites).
export function getTransitiveAncestors(nodeId: string, graph: Graph): ReadonlySet<string> {
  const visited = new Set<string>();
  const toVisit = [nodeId];

  while (toVisit.length) {
    const id = toVisit.pop();
    if (!id) {
      break;
    }

    for (const parent of getDirectAncestors(id, graph)) {
      if (!visited.has(parent)) {
        visited.add(parent);
        toVisit.push(parent);
      }
    }
  }

  return visited;
}

// Internal Kahn's pass; returns processed order and unprocessed (cycle) nodes.
function topoSortInternal(graph: Graph): {
  order: string[];
  unprocessed: string[];
} {
  const adjacency = buildAdjacency(graph);
  const inDegree = new Map<string, number>();

  for (const node of graph.nodes) {
    inDegree.set(node.id, node.data.prerequisites.length);
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (!degree) {
      queue.push(id);
    }
  }

  let head = 0;
  const order: string[] = [];
  while (head < queue.length) {
    const id = queue[head++];
    if (!id) {
      break;
    }
    order.push(id);

    const children = adjacency.get(id);
    if (!children) {
      continue;
    }

    for (const childId of children) {
      const current = inDegree.get(childId) ?? 0;
      const next = current - 1;
      inDegree.set(childId, next);
      if (!next) {
        queue.push(childId);
      }
    }
  }

  const processedSet = new Set(order);
  const unprocessed = graph.nodes.map((n) => n.id).filter((id) => !processedSet.has(id));

  return { order, unprocessed };
}

// Topological order (parents before children); null if the graph has a cycle.
export function topologicalSort(graph: Graph): string[] | null {
  const { order, unprocessed } = topoSortInternal(graph);
  return !unprocessed.length ? order : null;
}

// Carries the IDs of nodes that participate in (or are downstream of) the cycle.
export class CycleError extends Error {
  constructor(public readonly cycleNodes: readonly string[]) {
    super(`Cycle detected — unprocessed nodes: ${cycleNodes.join(", ")}`);
    this.name = "CycleError";
  }
}

// Throws CycleError if the graph contains a cycle; no-op otherwise.
export function validateAcyclic(graph: Graph): void {
  const { unprocessed } = topoSortInternal(graph);
  if (unprocessed.length) {
    throw new CycleError(unprocessed);
  }
}

// One node's ancestor info — direct prerequisites and the transitive closure.
type AncestorEntry = {
  direct: ReadonlySet<string>;
  transitive: ReadonlySet<string>;
};

// Per-node ancestor cache. Built once at graph load; consumers do O(1) lookups.
export type AncestorIndex = ReadonlyMap<string, AncestorEntry>;

// Build the ancestor index for every node in the graph. Throws CycleError on cycle.
export function buildAncestorIndex(graph: Graph): AncestorIndex {
  // Process in topological order so every parent is already in the index
  // before we read it for the union.
  const { order, unprocessed } = topoSortInternal(graph);
  if (unprocessed.length) {
    throw new CycleError(unprocessed);
  }

  const index = new Map<string, AncestorEntry>();

  for (const id of order) {
    const direct = getDirectAncestors(id, graph);
    const transitive = new Set<string>();

    // transitive(n) = direct(n) ∪ ⋃ transitive(parent)
    for (const parent of direct) {
      transitive.add(parent);
      const parentEntry = index.get(parent);
      if (parentEntry) {
        for (const ancestor of parentEntry.transitive) {
          transitive.add(ancestor);
        }
      }
    }

    index.set(id, { direct, transitive });
  }

  return index;
}

// Sanity check that node.data.prerequisites and the top-level edges[] agree.
// Production sends both representations; we trust prerequisites for traversal
// but we want to fail loud if the two ever diverge.
export function assertEdgesMatchPrerequisites(graph: Graph): void {
  // Build the set of edges implied by prerequisites: { "source→target" }
  const fromPrereqs = new Set<string>();
  for (const node of graph.nodes) {
    for (const parent of node.data.prerequisites) {
      fromPrereqs.add(`${parent}→${node.id}`);
    }
  }

  // Build the set of edges from the top-level edges[]
  const fromEdges = new Set<string>();
  for (const edge of graph.edges) {
    fromEdges.add(`${edge.source}→${edge.target}`);
  }

  // Symmetric difference: anything present in one but not the other is divergence
  const onlyInPrereqs = [...fromPrereqs].filter((e) => !fromEdges.has(e));
  const onlyInEdges = [...fromEdges].filter((e) => !fromPrereqs.has(e));

  if (onlyInPrereqs.length || onlyInEdges.length) {
    const details: string[] = [];
    if (onlyInPrereqs.length) {
      details.push(`only in prerequisites: ${onlyInPrereqs.join(", ")}`);
    }
    if (onlyInEdges.length) {
      details.push(`only in edges[]: ${onlyInEdges.join(", ")}`);
    }
    throw new Error(`edges[] and prerequisites disagree — ${details.join("; ")}`);
  }
}
