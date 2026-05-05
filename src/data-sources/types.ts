import type { AncestorIndex } from "@/domain/graph";
import type { FormDef, Graph, GraphNode, PrefillRef } from "@/domain/types";

export type { PrefillRef };

// Threaded into every DataSource call. `ancestors`, `nodesById`, `formsById`
export type DataSourceContext = {
  graph: Graph;
  targetNodeId: string;
  ancestors: AncestorIndex;
  nodesById: ReadonlyMap<string, GraphNode>;
  formsById: ReadonlyMap<string, FormDef>;
};

// Modal tree shape — recursive groups, selectable leaves.
export type DataNode =
  | { kind: "group"; id: string; label: string; children: readonly DataNode[] }
  | { kind: "leaf"; id: string; label: string; ref: PrefillRef };

export type LeafNode = Extract<DataNode, { kind: "leaf" }>;

export interface DataSource {
  id: string;
  label: string;
  getTree(ctx: DataSourceContext): readonly DataNode[];
  getTreeAsync?(ctx: DataSourceContext): Promise<readonly DataNode[]>;
}
