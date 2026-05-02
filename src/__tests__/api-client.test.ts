import { ApiError, fetchGraph, getFetchGraphOptionsFromEnv } from "@/api/client";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import mockGraphJson from "./fixtures/graph.json";
import { rejectsAs } from "./helpers";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

const baseOpts = {
  apiBase: "http://test.local",
  pathLayout: "unversioned" as const,
  tenantId: "1",
  blueprintId: "bp_test",
};

const concreteUnversionedUrl =
  "http://test.local/api/v1/1/actions/blueprints/bp_test/graph";
const graphUrlPattern = "http://test.local/api/v1/:tenant/actions/blueprints/:bp/graph";

describe("fetchGraph", () => {
  it("Returns a parsed Graph on 200 and hits the unversioned URL exactly", async () => {
    // Concrete URL pins buildPath's segment order against accidental shuffles.
    server.use(http.get(concreteUnversionedUrl, () => HttpResponse.json(mockGraphJson)));

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
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    server.use(
      http.get(graphUrlPattern, () =>
        HttpResponse.text("Not Found", { status: 404, statusText: "Not Found" }),
      ),
    );

    const error = await rejectsAs(fetchGraph(baseOpts), ApiError);

    expect(error.status).toBe(404);
    expect(error.problem.title).toBe("Not Found");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("error body was not JSON"),
    );
  });
});

describe("getFetchGraphOptionsFromEnv", () => {
  const unversionedEnv = {
    API_BASE: "http://localhost:3000",
    API_PATH_LAYOUT: "unversioned",
    TENANT_ID: "1",
    BLUEPRINT_ID: "bp_test",
  };

  const versionedEnv = {
    ...unversionedEnv,
    API_PATH_LAYOUT: "versioned",
    BLUEPRINT_VERSION_ID: "bpv_test",
  };

  it("Returns the unversioned variant when API_PATH_LAYOUT is unversioned", () => {
    const opts = getFetchGraphOptionsFromEnv(unversionedEnv);

    expect(opts).toEqual({
      apiBase: "http://localhost:3000",
      pathLayout: "unversioned",
      tenantId: "1",
      blueprintId: "bp_test",
    });
  });

  it("Returns the versioned variant including BLUEPRINT_VERSION_ID under versioned layout", () => {
    const opts = getFetchGraphOptionsFromEnv(versionedEnv);

    expect(opts).toEqual({
      apiBase: "http://localhost:3000",
      pathLayout: "versioned",
      tenantId: "1",
      blueprintId: "bp_test",
      blueprintVersionId: "bpv_test",
    });
  });

  it.each(["API_BASE", "API_PATH_LAYOUT", "TENANT_ID", "BLUEPRINT_ID"])(
    "Throws naming %s when it's unset",
    (key) => {
      const env = { ...unversionedEnv, [key]: undefined };

      expect(() => getFetchGraphOptionsFromEnv(env)).toThrow(new RegExp(key));
    },
  );

  it("Throws when API_PATH_LAYOUT is neither versioned nor unversioned", () => {
    const env = { ...unversionedEnv, API_PATH_LAYOUT: "legacy" };

    expect(() => getFetchGraphOptionsFromEnv(env)).toThrow(/API_PATH_LAYOUT/);
  });

  it("Throws on missing BLUEPRINT_VERSION_ID under versioned layout", () => {
    const env = { ...versionedEnv, BLUEPRINT_VERSION_ID: undefined };

    expect(() => getFetchGraphOptionsFromEnv(env)).toThrow(/BLUEPRINT_VERSION_ID/);
  });
});
