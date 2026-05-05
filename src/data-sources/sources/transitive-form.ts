import { formGroupsFor } from "@/data-sources/internal/form-groups";
import type { DataSource } from "@/data-sources/types";

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
