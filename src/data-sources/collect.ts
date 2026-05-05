import { list } from "@/data-sources/registry";
import type { DataNode, DataSourceContext } from "@/data-sources/types";

// Aggregate DataNodes from every registered source.
export async function collectTree(ctx: DataSourceContext): Promise<readonly DataNode[]> {
  const trees = await Promise.all(
    list().map((s) => (s.getTreeAsync ? s.getTreeAsync(ctx) : Promise.resolve(s.getTree(ctx)))),
  );
  return trees.flat();
}
