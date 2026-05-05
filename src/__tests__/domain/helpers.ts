import type { Graph, GraphNode } from "@/domain/types";
import { expect } from "vitest";

export function nodeFinder(graph: Graph): {
  byName: (name: string) => GraphNode;
  idByName: (name: string) => string;
} {
  const map = new Map(graph.nodes.map((n) => [n.data.name, n]));
  const byName = (name: string): GraphNode => {
    const node = map.get(name);
    if (!node) {
      throw new Error(`No fixture node named "${name}"`);
    }
    return node;
  };
  return {
    byName,
    idByName: (name) => byName(name).id,
  };
}

// Returns the typed error so callers can assert on its fields.
export async function rejectsAs<T>(
  promise: Promise<unknown>,
  ctor: new (...args: never[]) => T,
): Promise<T> {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ctor);
  return error as T;
}

// Construct a synthetic graph node for cycle / edge-case / property tests.
export function makeNode(id: string, prerequisites: string[] = []): GraphNode {
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
