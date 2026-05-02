import type { DataNode, DataSource } from "@/data-sources/types";

// Forms the target depends on directly (its prerequisites).
// Backed in production by action-blueprint-graph-get.
export const DirectFormSource: DataSource = {
  id: "direct-forms",
  label: "Direct upstream forms",

  getTree({ targetNodeId, ancestors, nodesById, formsById }) {
    const direct = ancestors.get(targetNodeId)?.direct;
    if (!direct) {
      return [];
    }

    const groups: DataNode[] = [];

    for (const nodeId of direct) {
      const node = nodesById.get(nodeId);
      if (!node) {
        continue;
      }
      const form = formsById.get(node.data.component_id);
      if (!form) {
        continue;
      }

      const children: DataNode[] = Object.keys(form.field_schema.properties).map(
        (fieldKey): DataNode => ({
          kind: "leaf",
          id: `direct:${nodeId}:${fieldKey}`,
          label: fieldKey,
          ref: { type: "form_field", nodeId, fieldKey },
        }),
      );

      groups.push({
        kind: "group",
        id: `direct:${nodeId}`,
        label: node.data.name,
        children,
      });
    }

    return groups;
  },
};
