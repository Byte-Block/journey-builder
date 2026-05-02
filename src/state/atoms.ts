import { atom } from "jotai";
// TODO(jotai v3): atomFamily moves out of jotai/utils into the standalone
// jotai-family package. Migration when v3 ships: `npm i jotai-family` and
// change this import to `import { atomFamily } from "jotai-family"`.
import { atomFamily, atomWithStorage } from "jotai/utils";

import type { MappingMap, PrefillRef } from "@/domain/types";

// Single root atom backing one localStorage key. Per-cell subscription is
// derived from this via fieldMappingFamily below — see PLAN.md §5.4.
export const mappingsAtom = atomWithStorage<MappingMap>("prefill-mappings", {});

// atomFamily param — identifies one cell of the prefill grid.
type FieldKey = { nodeId: string; fieldKey: string };

// Per-cell read/write atom. read → current PrefillRef or null; write → set ref
// or pass null to clear. Empty per-node maps are pruned so the persisted shape
// stays minimal.
export const fieldMappingFamily = atomFamily(
  ({ nodeId, fieldKey }: FieldKey) =>
    atom(
      (get) => get(mappingsAtom)[nodeId]?.[fieldKey] ?? null,
      (get, set, next: PrefillRef | null) => {
        const all = get(mappingsAtom);
        const forNode = { ...(all[nodeId] ?? {}) };
        if (!next) {
          delete forNode[fieldKey];
        } else {
          forNode[fieldKey] = next;
        }
        const nextAll = { ...all };
        if (!Object.keys(forNode).length) {
          delete nextAll[nodeId];
        } else {
          nextAll[nodeId] = forNode;
        }
        set(mappingsAtom, nextAll);
      },
    ),
  (a, b) => a.nodeId == b.nodeId && a.fieldKey == b.fieldKey,
);
