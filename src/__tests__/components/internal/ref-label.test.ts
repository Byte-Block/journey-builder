import { afterEach, describe, expect, it, vi } from "vitest";

import { getRefLabel } from "@/components/internal/ref-label";
import { buildLookups } from "@/domain/lookups";
import { GraphSchema } from "@/domain/schema";
import type { PrefillRef } from "@/domain/types";

import mockGraphJson from "../../fixtures/graph.json";
import { nodeFinder } from "../../domain/helpers";

const graph = GraphSchema.parse(mockGraphJson);
const lookups = buildLookups(graph);
const { idByName } = nodeFinder(graph);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getRefLabel", () => {
  it("Formats a form_field ref as SourceName.fieldKey", () => {
    const ref: PrefillRef = {
      type: "form_field",
      nodeId: idByName("Form B"),
      fieldKey: "email",
    };

    expect(getRefLabel(ref, lookups)).toBe("Form B.email");
  });

  it("Falls back to the raw nodeId when the source node is missing", () => {
    const ref: PrefillRef = {
      type: "form_field",
      nodeId: "form-zzz",
      fieldKey: "email",
    };

    expect(getRefLabel(ref, lookups)).toBe("form-zzz.email");
  });

  it("Formats a global ref with the action scope as 'Action Properties.key'", () => {
    const ref: PrefillRef = { type: "global", scope: "action", key: "id" };

    expect(getRefLabel(ref, lookups)).toBe("Action Properties.id");
  });

  it("Formats a global ref with the org scope as 'Client Organisation Properties.key'", () => {
    const ref: PrefillRef = { type: "global", scope: "org", key: "name" };

    expect(getRefLabel(ref, lookups)).toBe("Client Organisation Properties.name");
  });

  it("Falls back to the raw scope and warns once for an unknown scope", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Unique scope per test run so the module-scoped warn-once Set has not
    // seen it before, regardless of HMR or watch-mode reload state.
    const uniqueScope = `unknown-${Date.now()}-${Math.random()}`;
    const ref: PrefillRef = { type: "global", scope: uniqueScope, key: "id" };

    expect(getRefLabel(ref, lookups)).toBe(`${uniqueScope}.id`);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`unknown scope ${uniqueScope}`));

    // Subsequent call dedupes — Set tracks per-scope.
    const callsAfterFirst = warn.mock.calls.length;
    getRefLabel(ref, lookups);
    expect(warn.mock.calls.length).toBe(callsAfterFirst);
  });
});
