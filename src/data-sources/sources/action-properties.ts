import type { DataNode, DataSource } from "@/data-sources/types";

const ACTION_KEYS = ["id", "created_at", "tenant_id"] as const;

// Action-level properties — stubbed per brief permission.
// Backed in production by tenant-config-get.
export const ActionPropertiesSource: DataSource = {
  id: "action-properties",
  label: "Action Properties",

  getTree() {
    const children: DataNode[] = ACTION_KEYS.map(
      (key): DataNode => ({
        kind: "leaf",
        id: `action:${key}`,
        label: `action.${key}`,
        ref: { type: "global", scope: "action", key },
      }),
    );

    return [
      {
        kind: "group",
        id: "action:group",
        label: "Action Properties",
        children,
      },
    ];
  },
};
