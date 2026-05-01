import { FieldDefSchema, GraphSchema, ProblemDetailsSchema } from "@/domain/schema";
import { describe, expect, it } from "vitest";
import mockGraph from "./fixtures/graph.json";

describe("GraphSchema", () => {
  it("Parses a valid graph", () => {
    const result = GraphSchema.safeParse(mockGraph);
    expect(result.success).toBe(true);
  });

  it("Rejects a graph missing tenant_id", () => {
    const corrupted: Record<string, unknown> = { ...mockGraph };
    delete corrupted.tenant_id;

    const result = GraphSchema.safeParse(corrupted);

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("tenant_id");
    }
  });

  it("Rejects branches with wrong type", () => {
    const corrupted = { ...mockGraph, branches: "not-an-array" };
    const result = GraphSchema.safeParse(corrupted);

    expect(result.success).toBe(false);
  });
});

describe("FieldDefSchema", () => {
  it("Rejects an unknown avantos_type", () => {
    const result = FieldDefSchema.safeParse({
      avantos_type: "video", // not in the 6-value enum
      type: "string",
    });

    expect(result.success).toBe(false);
  });

  it("Accepts all 6 valid avantos_type values", () => {
    const valid = [
      "short-text",
      "multi-line-text",
      "multi-select",
      "checkbox-group",
      "button",
      "object-enum",
    ] as const;

    for (const t of valid) {
      const result = FieldDefSchema.safeParse({ avantos_type: t, type: "string" });
      expect(result.success).toBe(true);
    }
  });
});

describe("ProblemDetailsSchema", () => {
  it("Parses a typical RFC 7807 response", () => {
    const problem = {
      type: "https://example.com/probs/out-of-credit",
      title: "You do not have enough credit.",
      status: 403,
      detail: "Your current balance is 30.",
      instance: "/account/12345",
    };
    const result = ProblemDetailsSchema.safeParse(problem);

    expect(result.success).toBe(true);
  });
});
