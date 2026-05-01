import { GraphSchema, ProblemDetailsSchema } from "@/domain/schema";
import type { Graph, ProblemDetails } from "@/domain/types";

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

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: ProblemDetails,
  ) {
    const title = problem.title ?? `HTTP ${status}`;
    const message = problem.detail ? `${status}: ${title} — ${problem.detail}` : `${status}: ${title}`;
    super(message);
    this.name = "ApiError";
  }
}

async function buildApiError(response: Response): Promise<ApiError> {
  let problem: ProblemDetails = { title: response.statusText };

  try {
    const body = await response.json();
    const parsed = ProblemDetailsSchema.safeParse(body);
    if (parsed.success) {
      problem = parsed.data;
    }
  } catch {
    // TODO: Body wasn't JSON; keep the statusText fallback.
  }

  return new ApiError(response.status, problem);
}

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
    throw await buildApiError(response);
  }

  const body = await response.json();
  return GraphSchema.parse(body);
}
