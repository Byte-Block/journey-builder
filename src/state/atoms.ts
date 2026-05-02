import { atom } from "jotai";
// TODO(jotai v3): atomFamily moves out of jotai/utils into the standalone
// jotai-family package. Migration when v3 ships: `npm i jotai-family` and
// change this import to `import { atomFamily } from "jotai-family"`.
import { atomFamily, atomWithStorage } from "jotai/utils";

import type { MappingMap, PrefillRef } from "@/domain/types";

const STORAGE_KEY = "prefill-mappings";
// Bump SCHEMA_VERSION when the persisted shape changes. Default policy is
// reject-and-discard on mismatch (see getItem below). Add a per-version
// migration branch only if a real upgrade requires preserving prior mappings.
const SCHEMA_VERSION = 1;

// Persisted envelope — versioning lets us detect old payloads on reload and
// fall back to {} rather than feed a stale shape into the new app.
type Persisted = { schemaVersion: number; mappings: MappingMap };

const isPersisted = (v: unknown): v is Persisted => {
  if (typeof v != "object" || v == null) {
    return false;
  }
  const o = v as Record<string, unknown>;
  return (
    typeof o.schemaVersion == "number" &&
    typeof o.mappings == "object" &&
    o.mappings != null
  );
};

// No `subscribe` method — cross-tab updates via `storage` events don't
// propagate. Out of scope for the take-home; see PLAN-04 deferred improvements
// for the implementation sketch if this is ever needed.
const versionedMappingsStorage = {
  getItem: (key: string, initialValue: MappingMap): MappingMap => {
    if (typeof window == "undefined") {
      return initialValue;
    }
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return initialValue;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isPersisted(parsed)) {
        console.warn(`[prefill] discarding mappings: malformed payload`);
        return initialValue;
      }
      if (parsed.schemaVersion != SCHEMA_VERSION) {
        console.warn(
          `[prefill] discarding mappings: schemaVersion ${parsed.schemaVersion} ≠ ${SCHEMA_VERSION}`,
        );
        return initialValue;
      }
      return parsed.mappings;
    } catch {
      console.warn(`[prefill] discarding mappings: parse error`);
      return initialValue;
    }
  },
  setItem: (key: string, value: MappingMap): void => {
    if (typeof window == "undefined") {
      return;
    }
    const wrapped: Persisted = {
      schemaVersion: SCHEMA_VERSION,
      mappings: value,
    };
    window.localStorage.setItem(key, JSON.stringify(wrapped));
  },
  removeItem: (key: string): void => {
    if (typeof window == "undefined") {
      return;
    }
    window.localStorage.removeItem(key);
  },
};

// Single root atom backing one localStorage key. Per-cell subscription is
// derived from this via fieldMappingFamily below — see PLAN.md §5.4.
export const mappingsAtom = atomWithStorage<MappingMap>(STORAGE_KEY, {}, versionedMappingsStorage);

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
