import type { DataNode } from "@/data-sources/types";

// Build a single-group tree of global properties: one group, one leaf per key.
// Used by Action Properties / Client Org Properties / future global-scope sources.
export function globalLeavesFor(
  scope: string,
  groupLabel: string,
  keys: readonly string[],
): DataNode[] {
  const children: DataNode[] = keys.map((key) => ({
    kind: "leaf",
    id: `${scope}:${key}`,
    label: `${scope}.${key}`,
    ref: { type: "global", scope, key },
  }));

  return [
    {
      kind: "group",
      id: `${scope}:group`,
      label: groupLabel,
      children,
    },
  ];
}
