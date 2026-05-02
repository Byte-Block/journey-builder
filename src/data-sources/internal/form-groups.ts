import type { DataNode, DataSourceContext } from "@/data-sources/types";

// Build form-shaped groups (one per nodeId, one leaf per field) for any
// form-list source. Direct vs. Transitive only differ in which nodeIds they pass.
export function formGroupsFor(
  nodeIds: Iterable<string>,
  prefix: string,
  { nodesById, formsById }: Pick<DataSourceContext, "nodesById" | "formsById">,
): DataNode[] {
  const groups: DataNode[] = [];

  for (const nodeId of nodeIds) {
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
        id: `${prefix}:${nodeId}:${fieldKey}`,
        label: fieldKey,
        ref: { type: "form_field", nodeId, fieldKey },
      }),
    );

    groups.push({
      kind: "group",
      id: `${prefix}:${nodeId}`,
      label: node.data.name,
      children,
    });
  }

  return groups;
}
