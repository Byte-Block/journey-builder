import type { GraphNode } from "@/domain/types";

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
