import { formGroupsFor } from "@/data-sources/internal/form-groups";
import type { DataSource } from "@/data-sources/types";

// Forms reachable upstream by any path, excluding direct prerequisites.
// Backed in production by action-blueprint-graph-get.
export const TransitiveFormSource: DataSource = {
  id: "transitive-forms",
  label: "Transitive upstream forms",

  getTree(ctx) {
    const entry = ctx.ancestors.get(ctx.targetNodeId);
    if (!entry) {
      return [];
    }
    // transitive \ direct — directs surface via DirectFormSource only
    const transitiveOnly = [...entry.transitive].filter((id) => !entry.direct.has(id));
    return formGroupsFor(transitiveOnly, "transitive", ctx);
  },
};
