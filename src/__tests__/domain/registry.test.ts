import { list, register, unregister } from "@/data-sources/registry";
import type { DataSource } from "@/data-sources/types";
import { afterEach, describe, expect, it } from "vitest";

const make = (id: string, label = id): DataSource => ({
  id,
  label,
  getTree: () => [],
});

const tracked: string[] = [];
const add = (s: DataSource): DataSource => {
  tracked.push(s.id);
  register(s);
  return s;
};

afterEach(() => {
  for (const id of tracked) {
    unregister(id);
  }
  tracked.length = 0;
});

describe("registry", () => {
  it("Adds a source that shows up in list()", () => {
    add(make("test-a"));
    expect(list().map((s) => s.id)).toContain("test-a");
  });

  it("Re-registering same id replaces in place (no duplicate, same position)", () => {
    add(make("test-a", "first"));
    add(make("test-b"));
    register(make("test-a", "second"));

    const ids = list().map((s) => s.id);
    expect(ids.filter((id) => id === "test-a")).toHaveLength(1);
    expect(ids.indexOf("test-a")).toBeLessThan(ids.indexOf("test-b"));
    expect(list().find((s) => s.id === "test-a")?.label).toBe("second");
  });

  it("Removes a registered source", () => {
    add(make("test-a"));
    unregister("test-a");
    expect(list().map((s) => s.id)).not.toContain("test-a");
  });

  it("No-op when unregistering an unknown id", () => {
    const before = list().length;
    expect(() => unregister("does-not-exist")).not.toThrow();
    expect(list()).toHaveLength(before);
  });

  it("Returns sources in registration order", () => {
    add(make("test-1"));
    add(make("test-2"));
    add(make("test-3"));
    const ids = list().map((s) => s.id);
    expect(ids.indexOf("test-1")).toBeLessThan(ids.indexOf("test-2"));
    expect(ids.indexOf("test-2")).toBeLessThan(ids.indexOf("test-3"));
  });
});
