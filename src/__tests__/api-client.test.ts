import { ApiError, fetchGraph } from "@/api/client";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import mockGraphJson from "./fixtures/graph.json";
import { rejectsAs } from "./helpers";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const baseOpts = {
  apiBase: "http://test.local",
  pathLayout: "unversioned" as const,
  tenantId: "1",
  blueprintId: "bp_test",
};

const graphUrlPattern = "http://test.local/api/v1/:tenant/actions/blueprints/:bp/graph";

describe("fetchGraph", () => {
  it("Returns a parsed Graph on 200", async () => {
    server.use(http.get(graphUrlPattern, () => HttpResponse.json(mockGraphJson)));

    const graph = await fetchGraph(baseOpts);

    expect(graph.nodes).toHaveLength(6);
    expect(graph.tenant_id).toBe("1");
  });

  it("Throws ZodError when the response shape is invalid", async () => {
    server.use(http.get(graphUrlPattern, () => HttpResponse.json({ nodes: [], forms: [] })));

    await expect(fetchGraph(baseOpts)).rejects.toBeInstanceOf(ZodError);
  });

  it("Throws ApiError with parsed problem details on a 5xx response", async () => {
    server.use(
      http.get(graphUrlPattern, () =>
        HttpResponse.json(
          {
            type: "https://example.com/probs/server-error",
            title: "Internal Server Error",
            detail: "Database unreachable",
            status: 500,
            instance: "/api/v1/1/actions/blueprints/bp_test/graph",
          },
          { status: 500 },
        ),
      ),
    );

    const error = await rejectsAs(fetchGraph(baseOpts), ApiError);

    expect(error.status).toBe(500);
    expect(error.problem.title).toBe("Internal Server Error");
    expect(error.problem.detail).toBe("Database unreachable");
  });

  it("Throws ApiError with the statusText fallback when the error body isn't JSON", async () => {
    server.use(
      http.get(graphUrlPattern, () =>
        HttpResponse.text("Not Found", { status: 404, statusText: "Not Found" }),
      ),
    );

    const error = await rejectsAs(fetchGraph(baseOpts), ApiError);

    expect(error.status).toBe(404);
    expect(error.problem.title).toBe("Not Found");
  });
});
