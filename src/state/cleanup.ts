import type { createStore } from "jotai";

import { buildLookups } from "@/domain/lookups";
import type { Graph, MappingMap, PrefillRef } from "@/domain/types";
import { mappingsAtom } from "@/state/atoms";

type Store = ReturnType<typeof createStore>;

// Drop mappings that point to nodes or fields that no longer exist in the
// graph. Both target side (the cell) and source side (form_field PrefillRef)
// are checked. Globals are stubbed and treated as always-valid. One
// console.info per dropped mapping so a graph migration is visible.
export function cleanupOrphans(graph: Graph, mappings: MappingMap): MappingMap {
  const { nodesById, formsById } = buildLookups(graph);

  const fieldsForNode = (nodeId: string): Set<string> | null => {
    const node = nodesById.get(nodeId);
    if (!node) {
      return null;
    }
    const form = formsById.get(node.data.component_id);
    if (!form) {
      return null;
    }
    return new Set(Object.keys(form.field_schema.properties));
  };

  const result: MappingMap = {};
  let changed = false;

  for (const [targetNodeId, byField] of Object.entries(mappings)) {
    const targetFields = fieldsForNode(targetNodeId);
    if (!targetFields) {
      for (const targetFieldKey of Object.keys(byField)) {
        console.info(
          `[prefill] orphan dropped: target ${targetNodeId}.${targetFieldKey} — node not in graph`,
        );
      }
      changed = true;
      continue;
    }

    let nodeChanged = false;
    const survivors: Record<string, PrefillRef> = {};
    for (const [targetFieldKey, ref] of Object.entries(byField)) {
      if (!targetFields.has(targetFieldKey)) {
        console.info(
          `[prefill] orphan dropped: target ${targetNodeId}.${targetFieldKey} — field not in form`,
        );
        nodeChanged = true;
        continue;
      }

      if (ref.type == "form_field") {
        const sourceFields = fieldsForNode(ref.nodeId);
        if (!sourceFields) {
          console.info(
            `[prefill] orphan dropped: source ${ref.nodeId}.${ref.fieldKey} — node not in graph`,
          );
          nodeChanged = true;
          continue;
        }
        if (!sourceFields.has(ref.fieldKey)) {
          console.info(
            `[prefill] orphan dropped: source ${ref.nodeId}.${ref.fieldKey} — field not in form`,
          );
          nodeChanged = true;
          continue;
        }
      }

      survivors[targetFieldKey] = ref;
    }

    if (!nodeChanged) {
      result[targetNodeId] = byField;
      continue;
    }

    changed = true;
    if (Object.keys(survivors).length) {
      result[targetNodeId] = survivors;
    }
  }

  return changed ? result : mappings;
}

// Wire-up: read mappingsAtom, prune, write back. Called once after fetchGraph
// resolves (typically from JourneyBuilder's mount effect in PLAN-05). Skips
// the write when nothing changed so subscribers don't re-fire spuriously.
export function pruneOrphansInto(store: Store, graph: Graph): void {
  const current = store.get(mappingsAtom);
  const pruned = cleanupOrphans(graph, current);
  if (pruned != current) {
    store.set(mappingsAtom, pruned);
  }
}
