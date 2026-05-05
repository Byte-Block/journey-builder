import { describe, expect, it } from "vitest";

import { GraphSchema } from "@/domain/schema";
import type { Graph, MappingMap, PrefillRef } from "@/domain/types";
import { mappingsToGraph, wouldCreateCycle, type ProposedMapping } from "@/state/cycles";

import mockGraphJson from "../fixtures/graph.json";
import { nodeFinder } from "../domain/helpers";

const graph: Graph = GraphSchema.parse(mockGraphJson);
const { idByName } = nodeFinder(graph);

const formA = idByName("Form A");
const formB = idByName("Form B");
const formC = idByName("Form C");
const formD = idByName("Form D");

const formField = (nodeId: string, fieldKey: string): PrefillRef => ({
  type: "form_field",
  nodeId,
  fieldKey,
});

const propose = (
  targetNodeId: string,
  targetFieldKey: string,
  sourceNodeId: string,
  sourceFieldKey: string,
): ProposedMapping => ({
  targetNodeId,
  targetFieldKey,
  ref: formField(sourceNodeId, sourceFieldKey),
});

describe("mappingsToGraph", () => {
  it("Encodes each mapping as an edge from source field to target field", () => {
    const mappings: MappingMap = {
      [formB]: { email: formField(formA, "email") },
    };

    const items = mappingsToGraph(mappings, graph);
    const byId = new Map(items.map((i) => [i.id, i]));

    expect(byId.get(`${formB}.email`)?.prerequisites).toEqual([`${formA}.email`]);
    expect(byId.get(`${formA}.email`)?.prerequisites).toEqual([]);
  });

  it("Skips global mappings — they don't participate in field-graph cycles", () => {
    const mappings: MappingMap = {
      [formB]: { email: { type: "global", scope: "action", key: "now" } },
    };

    expect(mappingsToGraph(mappings, graph)).toEqual([]);
  });

  it("Skips mappings whose endpoints don't resolve in the form graph", () => {
    const mappings: MappingMap = {
      [formB]: { email: formField("form-zzz", "email") },
      "form-zzz": { email: formField(formA, "email") },
    };

    expect(mappingsToGraph(mappings, graph)).toEqual([]);
  });

  it("Encodes a multi-edge projection with fan-out and chaining", () => {
    // A.email is a root that fans out to B.email and D.email; B.email then
    // chains to C.email. Four cells, three edges, no cycle.
    const mappings: MappingMap = {
      [formB]: { email: formField(formA, "email") },
      [formC]: { email: formField(formB, "email") },
      [formD]: { email: formField(formA, "email") },
    };

    const items = mappingsToGraph(mappings, graph);
    const byId = new Map(items.map((i) => [i.id, i]));

    expect(items).toHaveLength(4);
    expect(byId.get(`${formA}.email`)?.prerequisites).toEqual([]);
    expect(byId.get(`${formB}.email`)?.prerequisites).toEqual([`${formA}.email`]);
    expect(byId.get(`${formC}.email`)?.prerequisites).toEqual([`${formB}.email`]);
    expect(byId.get(`${formD}.email`)?.prerequisites).toEqual([`${formA}.email`]);
  });
});

describe("wouldCreateCycle", () => {
  it("(a) Accepts a non-cyclic mapping addition", () => {
    const mappings: MappingMap = {};
    const proposed = propose(formB, "email", formA, "email");

    expect(wouldCreateCycle(mappings, graph, proposed)).toBe(false);
  });

  it("(b) Rejects a self-mapping (A.email ← A.email)", () => {
    const mappings: MappingMap = {};
    const proposed = propose(formA, "email", formA, "email");

    expect(wouldCreateCycle(mappings, graph, proposed)).toBe(true);
  });

  it("(c) Rejects a 2-cycle: A.email ← B.email exists, propose B.email ← A.email", () => {
    const mappings: MappingMap = {
      [formA]: { email: formField(formB, "email") },
    };
    const proposed = propose(formB, "email", formA, "email");

    expect(wouldCreateCycle(mappings, graph, proposed)).toBe(true);
  });

  it("(d) Accepts a deep but acyclic chain (D ← C ← B ← A)", () => {
    const mappings: MappingMap = {
      [formC]: { email: formField(formB, "email") },
      [formB]: { email: formField(formA, "email") },
    };
    const proposed = propose(formD, "email", formC, "email");

    expect(wouldCreateCycle(mappings, graph, proposed)).toBe(false);
  });

  it("Accepts global proposals — globals can't close field-graph cycles", () => {
    const mappings: MappingMap = {
      [formA]: { email: formField(formB, "email") },
    };
    const proposed: ProposedMapping = {
      targetNodeId: formB,
      targetFieldKey: "email",
      ref: { type: "global", scope: "action", key: "now" },
    };

    expect(wouldCreateCycle(mappings, graph, proposed)).toBe(false);
  });

  it("Treats a re-proposal that overwrites an existing mapping as the new edge", () => {
    // Existing: B.email ← A.email. Proposing A.email ← B.email closes a cycle.
    const mappings: MappingMap = {
      [formB]: { email: formField(formA, "email") },
    };
    const proposed = propose(formA, "email", formB, "email");

    expect(wouldCreateCycle(mappings, graph, proposed)).toBe(true);
  });

  it("Accepts a mapping whose proposal replaces an existing mapping for the same target", () => {
    // Existing: B.email ← A.email. Proposed: B.email ← A.name (replaces).
    // The proposal overwrites at the target; result is one acyclic edge.
    const mappings: MappingMap = {
      [formB]: { email: formField(formA, "email") },
    };
    const proposed = propose(formB, "email", formA, "name");

    expect(wouldCreateCycle(mappings, graph, proposed)).toBe(false);
  });
});
