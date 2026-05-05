import { createStore } from "jotai";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PrefillRef } from "@/domain/types";
import { fieldMappingFamily, mappingsAtom } from "@/state/atoms";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
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
  it("Persists writes to localStorage under prefill-mappings in a versioned envelope", () => {
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
    expect(JSON.parse(raw!)).toEqual({
      schemaVersion: 1,
      mappings: { A: { email: ref } },
    });
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

describe("mappingsAtom persistence schema versioning", () => {
  const ref: PrefillRef = {
    type: "form_field",
    nodeId: "B",
    fieldKey: "email",
  };

  it("Loads a valid v1 payload on first read", () => {
    window.localStorage.setItem(
      "prefill-mappings",
      JSON.stringify({ schemaVersion: 1, mappings: { A: { email: ref } } }),
    );

    const store = createStore();
    const unsub = store.sub(mappingsAtom, () => {});
    try {
      expect(store.get(mappingsAtom)).toEqual({ A: { email: ref } });
    } finally {
      unsub();
    }
  });

  it("Discards a payload with a stale schemaVersion and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    window.localStorage.setItem(
      "prefill-mappings",
      JSON.stringify({ schemaVersion: 0, mappings: { A: { email: ref } } }),
    );

    const store = createStore();
    const unsub = store.sub(mappingsAtom, () => {});
    try {
      expect(store.get(mappingsAtom)).toEqual({});
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("schemaVersion"));
    } finally {
      unsub();
    }
  });

  it("Discards a malformed JSON payload and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    window.localStorage.setItem("prefill-mappings", "{not json");

    const store = createStore();
    const unsub = store.sub(mappingsAtom, () => {});
    try {
      expect(store.get(mappingsAtom)).toEqual({});
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("parse error"));
    } finally {
      unsub();
    }
  });

  it("Discards a payload missing the envelope shape and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    window.localStorage.setItem("prefill-mappings", JSON.stringify({ A: { email: ref } }));

    const store = createStore();
    const unsub = store.sub(mappingsAtom, () => {});
    try {
      expect(store.get(mappingsAtom)).toEqual({});
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("malformed"));
    } finally {
      unsub();
    }
  });

  it("Round-trips writes through localStorage into a fresh store", () => {
    const writer = createStore();
    const cell = fieldMappingFamily({ nodeId: "A", fieldKey: "email" });
    writer.set(cell, ref);

    const reader = createStore();
    const unsub = reader.sub(mappingsAtom, () => {});
    try {
      expect(reader.get(mappingsAtom)).toEqual({ A: { email: ref } });
      expect(reader.get(cell)).toEqual(ref);
    } finally {
      unsub();
    }
  });
});
