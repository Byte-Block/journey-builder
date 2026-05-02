import { formGroupsFor } from "@/data-sources/internal/form-groups";
import type { DataSource } from "@/data-sources/types";

// Forms the target depends on directly (its prerequisites).
// Backed in production by action-blueprint-graph-get.
export const DirectFormSource: DataSource = {
  id: "direct-forms",
  label: "Direct upstream forms",

  getTree(ctx) {
    const entry = ctx.ancestors.get(ctx.targetNodeId);
    if (!entry) {
      return [];
    }
    return formGroupsFor(entry.direct, "direct", ctx);
  },
};
