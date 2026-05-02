import { globalLeavesFor } from "@/data-sources/internal/global-leaves";
import type { DataSource } from "@/data-sources/types";

const ACTION_KEYS = ["id", "created_at", "tenant_id"] as const;

// Action-level properties — stubbed per brief permission.
// Backed in production by tenant-config-get.
export const ActionPropertiesSource: DataSource = {
  id: "action-properties",
  label: "Action Properties",
  getTree: () => globalLeavesFor("action", "Action Properties", ACTION_KEYS),
};
