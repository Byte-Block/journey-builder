import { createStore } from "jotai";
import { afterEach, describe, expect, it } from "vitest";

import type { PrefillRef } from "@/domain/types";
import { fieldMappingFamily, mappingsAtom } from "@/state/atoms";

afterEach(() => {
  window.localStorage.clear();
});

describe("fieldMappingFamily", () => {
  it("Round-trips a PrefillRef through set, get, and clear", () => {
    const store = createStore();
    const cell = fieldMappingFamily({ nodeId: "A", fieldKey: "email" });
    const ref: PrefillRef = {
      type: "form_field",
      nodeId: "B",
      fieldKey: "email",
    };

    store.set(cell, ref);
    expect(store.get(cell)).toEqual(ref);

    store.set(cell, null);
    expect(store.get(cell)).toBeNull();
  });

  it("Returns the same atom instance for equal params", () => {
    const a = fieldMappingFamily({ nodeId: "A", fieldKey: "email" });
    const b = fieldMappingFamily({ nodeId: "A", fieldKey: "email" });
    expect(a).toBe(b);
  });

  it("Returns different atom instances for different params", () => {
    const a = fieldMappingFamily({ nodeId: "A", fieldKey: "email" });
    const b = fieldMappingFamily({ nodeId: "A", fieldKey: "name" });
    expect(a).not.toBe(b);
  });

  it("Isolates sibling cells — clearing one leaves the other intact", () => {
    const store = createStore();
    const cellA = fieldMappingFamily({ nodeId: "X", fieldKey: "email" });
    const cellB = fieldMappingFamily({ nodeId: "X", fieldKey: "name" });
    const refA: PrefillRef = {
      type: "form_field",
      nodeId: "B",
      fieldKey: "email",
    };
    const refB: PrefillRef = { type: "global", scope: "action", key: "now" };

    store.set(cellA, refA);
    store.set(cellB, refB);
    store.set(cellA, null);

    expect(store.get(cellA)).toBeNull();
    expect(store.get(cellB)).toEqual(refB);
  });

  it("Clears gracefully when the cell was never set", () => {
    const store = createStore();
    const cell = fieldMappingFamily({ nodeId: "Z", fieldKey: "ghost" });

    expect(store.get(cell)).toBeNull();
    store.set(cell, null);
    expect(store.get(cell)).toBeNull();
    expect(store.get(mappingsAtom)).toEqual({});
  });
});

describe("mappingsAtom", () => {
  it("Persists writes to localStorage under prefill-mappings as a single key", () => {
    const store = createStore();
    const cell = fieldMappingFamily({ nodeId: "A", fieldKey: "email" });
    const ref: PrefillRef = {
      type: "form_field",
      nodeId: "B",
      fieldKey: "email",
    };

    store.set(cell, ref);

    const raw = window.localStorage.getItem("prefill-mappings");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual({ A: { email: ref } });
    expect(window.localStorage.length).toBe(1);
  });

  it("Prunes the per-node sub-map when its last cell is cleared", () => {
    const store = createStore();
    const cell = fieldMappingFamily({ nodeId: "A", fieldKey: "email" });
    const ref: PrefillRef = {
      type: "form_field",
      nodeId: "B",
      fieldKey: "email",
    };

    store.set(cell, ref);
    store.set(cell, null);

    expect(store.get(mappingsAtom)).toEqual({});
  });
});
