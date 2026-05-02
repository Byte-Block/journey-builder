import type { AncestorIndex } from "@/domain/graph";
import type { Graph, PrefillRef } from "@/domain/types";

export type { PrefillRef };

// Threaded into every DataSource call. `ancestors` is pre-built for O(1) lookups.
export type DataSourceContext = {
  graph: Graph;
  targetNodeId: string;
  ancestors: AncestorIndex;
};

// Modal tree shape — recursive groups, selectable leaves.
export type DataNode =
  | { kind: "group"; id: string; label: string; children: readonly DataNode[] }
  | { kind: "leaf"; id: string; label: string; ref: PrefillRef };

/**
 * Pluggable prefill source. New source = new file + one register() line in index.ts.
 *
 * Built-ins:
 *   DirectFormSource, TransitiveFormSource ← action-blueprint-graph-get
 *   ActionPropertiesSource                 ← tenant-config-get
 *   ClientOrgPropertiesSource              ← client-organisation-graph-get
 */
export interface DataSource {
  id: string;
  label: string;

  /**
   * Synchronous tree generation for sources whose data is in memory
   * (form fields from the loaded graph, stubbed globals).
   */
  getTree(ctx: DataSourceContext): readonly DataNode[];

  /**
   * Async tree generation for sources that fetch from a remote endpoint.
   * Optional — collectTree prefers this method when present, falls back to getTree.
   */
  getTreeAsync?(ctx: DataSourceContext): Promise<readonly DataNode[]>;
}
