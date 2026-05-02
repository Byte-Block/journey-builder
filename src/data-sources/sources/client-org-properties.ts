import { globalLeavesFor } from "@/data-sources/internal/global-leaves";
import type { DataSource } from "@/data-sources/types";

const ORG_KEYS = ["id", "name", "country"] as const;

// Client-organisation-level properties — stubbed per brief permission.
// Backed in production by client-organisation-graph-get.
export const ClientOrgPropertiesSource: DataSource = {
  id: "client-org-properties",
  label: "Client Organisation Properties",
  getTree: () => globalLeavesFor("org", "Client Organisation Properties", ORG_KEYS),
};
