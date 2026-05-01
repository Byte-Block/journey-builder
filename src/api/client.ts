import { GraphSchema } from "@/domain/schema";
import type { Graph } from "@/domain/types";

export type PathLayout = "unversioned" | "versioned";

export type FetchGraphOptions =
  | {
      apiBase: string;
      pathLayout: "unversioned";
      tenantId: string;
      blueprintId: string;
    }
  | {
      apiBase: string;
      pathLayout: "versioned";
      tenantId: string;
      blueprintId: string;
      blueprintVersionId: string;
    };

function buildPath(opts: FetchGraphOptions): string {
  return opts.pathLayout === "unversioned"
    ? `/api/v1/${opts.tenantId}/actions/blueprints/${opts.blueprintId}/graph`
    : `/api/v1/${opts.tenantId}/actions/blueprints/${opts.blueprintId}/${opts.blueprintVersionId}/graph`;
}

export async function fetchGraph(opts: FetchGraphOptions): Promise<Graph> {
  const url = `${opts.apiBase}${buildPath(opts)}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json, application/problem+json",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const body = await response.json();
  return GraphSchema.parse(body);
}
