import { createStore } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

import { GraphSchema } from "@/domain/schema";
import type { Graph, MappingMap, PrefillRef } from "@/domain/types";
import { mappingsAtom } from "@/state/atoms";
import { cleanupOrphans, pruneOrphansInto } from "@/state/cleanup";

import mockGraphJson from "./fixtures/graph.json";
import { nodeFinder } from "./helpers";

const graph: Graph = GraphSchema.parse(mockGraphJson);
const { idByName } = nodeFinder(graph);

const formA = idByName("Form A");
const formB = idByName("Form B");

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("cleanupOrphans", () => {
  let info: MockInstance;

  beforeEach(() => {
    info = vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it("Drops a mapping whose source node is no longer in the graph", () => {
    const mappings: MappingMap = {
      [formB]: {
        email: { type: "form_field", nodeId: "form-zzz", fieldKey: "email" },
      },
    };

    const result = cleanupOrphans(graph, mappings);

    expect(result).toEqual({});
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith(expect.stringMatching(/source form-zzz\.email/));
  });

  it("Drops a mapping whose target node is no longer in the graph", () => {
    const mappings: MappingMap = {
      "form-zzz": {
        email: { type: "form_field", nodeId: formA, fieldKey: "email" },
      },
    };

    const result = cleanupOrphans(graph, mappings);

    expect(result).toEqual({});
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith(expect.stringMatching(/target form-zzz\.email/));
  });

  it("Drops a mapping whose target field is no longer in the form", () => {
    const mappings: MappingMap = {
      [formB]: {
        ghost_field: { type: "form_field", nodeId: formA, fieldKey: "email" },
      },
    };

    const result = cleanupOrphans(graph, mappings);

    expect(result).toEqual({});
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith(expect.stringContaining("field not in form"));
  });

  it("Drops a mapping whose source field is no longer in the source form", () => {
    const mappings: MappingMap = {
      [formB]: {
        email: { type: "form_field", nodeId: formA, fieldKey: "ghost_field" },
      },
    };

    const result = cleanupOrphans(graph, mappings);

    expect(result).toEqual({});
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith(expect.stringMatching(/source .*ghost_field/));
  });

  it("Keeps a valid form_field mapping unchanged", () => {
    const ref: PrefillRef = {
      type: "form_field",
      nodeId: formA,
      fieldKey: "email",
    };
    const mappings: MappingMap = { [formB]: { email: ref } };

    const result = cleanupOrphans(graph, mappings);

    expect(result).toEqual(mappings);
    expect(info).not.toHaveBeenCalled();
  });

  it("Keeps global mappings unchanged — they are stubbed and always valid", () => {
    const ref: PrefillRef = { type: "global", scope: "action", key: "now" };
    const mappings: MappingMap = { [formB]: { email: ref } };

    const result = cleanupOrphans(graph, mappings);

    expect(result).toEqual(mappings);
  });

  it("Returns the same reference when nothing was dropped", () => {
    const ref: PrefillRef = {
      type: "form_field",
      nodeId: formA,
      fieldKey: "email",
    };
    const mappings: MappingMap = { [formB]: { email: ref } };

    expect(cleanupOrphans(graph, mappings)).toBe(mappings);
  });

  it("Preserves surviving fields when a sibling cell is dropped", () => {
    const validRef: PrefillRef = {
      type: "form_field",
      nodeId: formA,
      fieldKey: "email",
    };
    const orphanRef: PrefillRef = {
      type: "form_field",
      nodeId: "form-zzz",
      fieldKey: "x",
    };
    const mappings: MappingMap = {
      [formB]: { email: validRef, name: orphanRef },
    };

    const result = cleanupOrphans(graph, mappings);

    expect(result).toEqual({ [formB]: { email: validRef } });
    expect(info).toHaveBeenCalledTimes(1);
  });

  it("Drops the per-node sub-map entirely when its last cell is orphaned", () => {
    const mappings: MappingMap = {
      [formB]: {
        email: { type: "form_field", nodeId: "form-zzz", fieldKey: "x" },
      },
    };

    const result = cleanupOrphans(graph, mappings);

    expect(result).toEqual({});
    expect(formB in result).toBe(false);
    expect(info).toHaveBeenCalledTimes(1);
  });
});

describe("pruneOrphansInto", () => {
  it("Removes orphaned localStorage mappings on graph load", () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    window.localStorage.setItem(
      "prefill-mappings",
      JSON.stringify({
        schemaVersion: 1,
        mappings: {
          [formB]: {
            email: { type: "form_field", nodeId: "form-zzz", fieldKey: "x" },
          },
        },
      }),
    );

    const store = createStore();
    const unsub = store.sub(mappingsAtom, () => {});
    try {
      pruneOrphansInto(store, graph);
      expect(store.get(mappingsAtom)).toEqual({});
    } finally {
      unsub();
    }
  });

  it("Does not touch mappingsAtom when nothing is orphaned", () => {
    const ref: PrefillRef = {
      type: "form_field",
      nodeId: formA,
      fieldKey: "email",
    };
    window.localStorage.setItem(
      "prefill-mappings",
      JSON.stringify({
        schemaVersion: 1,
        mappings: { [formB]: { email: ref } },
      }),
    );

    const store = createStore();
    const unsub = store.sub(mappingsAtom, () => {});
    try {
      const before = store.get(mappingsAtom);
      pruneOrphansInto(store, graph);
      const after = store.get(mappingsAtom);
      expect(after).toBe(before);
    } finally {
      unsub();
    }
  });
});
