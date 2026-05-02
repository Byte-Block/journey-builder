import type { GraphLookups } from "@/domain/lookups";
import type { PrefillRef } from "@/domain/types";

import { createWarnOnce } from "./warn-once";

// Closed union over the scopes emitted by the global data sources. Adding a
// new global scope without updating SCOPE_LABELS fails typecheck — keeps the
// row's mapped-state label in sync without a runtime registry.
type KnownScope = "action" | "org";

const SCOPE_LABELS: Record<KnownScope, string> = {
  action: "Action Properties",
  org: "Client Organisation Properties",
};

const isKnownScope = (scope: string): scope is KnownScope => scope in SCOPE_LABELS;

const warnUnknownScope = createWarnOnce();

// Format a PrefillRef for the row's mapped-state label.
//   form_field → "Form A.email"   (sourceName.fieldKey)
//   global     → "Action Properties.id"   (scopeLabel.key)
// Unknown scope warns once and falls back to the raw scope string — silent
// throw would crash the row, which is worse than a slightly-ugly label.
export function getRefLabel(ref: PrefillRef, lookups: GraphLookups): string {
  if (ref.type == "form_field") {
    const node = lookups.nodesById.get(ref.nodeId);
    const sourceName = node?.data.name ?? ref.nodeId;
    return `${sourceName}.${ref.fieldKey}`;
  }
  if (!isKnownScope(ref.scope)) {
    warnUnknownScope(ref.scope, `[ref-label] unknown scope ${ref.scope}; using raw value`);
    return `${ref.scope}.${ref.key}`;
  }
  return `${SCOPE_LABELS[ref.scope]}.${ref.key}`;
}
