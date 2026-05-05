import { topologicalSortItems, type ToposortItem } from "@/domain/graph";
import { buildLookups } from "@/domain/lookups";
import type { Graph, MappingMap, PrefillRef } from "@/domain/types";

const compositeId = (nodeId: string, fieldKey: string): string => `${nodeId}.${fieldKey}`;

export type ProposedMapping = {
  targetNodeId: string;
  targetFieldKey: string;
  ref: PrefillRef;
};

export function mappingsToGraph(mappings: MappingMap, formGraph: Graph): readonly ToposortItem[] {
  const { nodesById, formsById } = buildLookups(formGraph);

  const fieldExists = (nodeId: string, fieldKey: string): boolean => {
    const node = nodesById.get(nodeId);
    if (!node) {
      return false;
    }
    const form = formsById.get(node.data.component_id);
    if (!form) {
      return false;
    }
    return fieldKey in form.field_schema.properties;
  };

  type Mut = { id: string; prerequisites: string[] };
  const items = new Map<string, Mut>();
  const ensure = (id: string): Mut => {
    let item = items.get(id);
    if (!item) {
      item = { id, prerequisites: [] };
      items.set(id, item);
    }
    return item;
  };

  for (const [targetNodeId, byField] of Object.entries(mappings)) {
    for (const [targetFieldKey, ref] of Object.entries(byField)) {
      if (ref.type != "form_field") {
        continue;
      }
      if (!fieldExists(targetNodeId, targetFieldKey)) {
        continue;
      }
      if (!fieldExists(ref.nodeId, ref.fieldKey)) {
        continue;
      }

      const targetId = compositeId(targetNodeId, targetFieldKey);
      const sourceId = compositeId(ref.nodeId, ref.fieldKey);

      ensure(sourceId);
      ensure(targetId).prerequisites.push(sourceId);
    }
  }

  return [...items.values()];
}

export function wouldCreateCycle(
  mappings: MappingMap,
  formGraph: Graph,
  proposed: ProposedMapping,
): boolean {
  if (proposed.ref.type != "form_field") {
    return false;
  }

  const candidate: MappingMap = {
    ...mappings,
    [proposed.targetNodeId]: {
      ...(mappings[proposed.targetNodeId] ?? {}),
      [proposed.targetFieldKey]: proposed.ref,
    },
  };

  return topologicalSortItems(mappingsToGraph(candidate, formGraph)) == null;
}
