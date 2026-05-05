import { GraphSchema, ProblemDetailsSchema } from "@/domain/schema";
import type { Graph, ProblemDetails } from "@/domain/types";

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

// Structural shape of an env-var bag — `process.env`
type EnvBag = Record<string, string | undefined>;

function envOrThrow(env: EnvBag, key: string): string {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Reads the env-var contract documented in .env.development and returns the
// matching FetchGraphOptions variant.
export function getFetchGraphOptionsFromEnv(env: EnvBag = process.env): FetchGraphOptions {
  const apiBase = envOrThrow(env, "API_BASE");
  const pathLayout = envOrThrow(env, "API_PATH_LAYOUT");
  if (pathLayout != "unversioned" && pathLayout != "versioned") {
    throw new Error(
      `Invalid API_PATH_LAYOUT: "${pathLayout}" — expected "unversioned" or "versioned"`,
    );
  }
  const tenantId = envOrThrow(env, "TENANT_ID");
  const blueprintId = envOrThrow(env, "BLUEPRINT_ID");

  if (pathLayout == "unversioned") {
    return { apiBase, pathLayout, tenantId, blueprintId };
  }
  return {
    apiBase,
    pathLayout,
    tenantId,
    blueprintId,
    blueprintVersionId: envOrThrow(env, "BLUEPRINT_VERSION_ID"),
  };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: ProblemDetails,
  ) {
    const title = problem.title ?? `HTTP ${status}`;
    const message = problem.detail
      ? `${status}: ${title} — ${problem.detail}`
      : `${status}: ${title}`;
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
    console.warn(
      `[api] HTTP ${response.status} ${response.url}: error body was not JSON, using statusText fallback`,
    );
  }

  return new ApiError(response.status, problem);
}

function buildPath(opts: FetchGraphOptions): string {
  return opts.pathLayout == "unversioned"
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
