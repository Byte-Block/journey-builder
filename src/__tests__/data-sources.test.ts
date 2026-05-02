import "@/data-sources";
import { collectTree } from "@/data-sources/collect";
import { register, unregister } from "@/data-sources/registry";
import { ActionPropertiesSource } from "@/data-sources/sources/action-properties";
import { ClientOrgPropertiesSource } from "@/data-sources/sources/client-org-properties";
import { DirectFormSource } from "@/data-sources/sources/direct-form";
import { TransitiveFormSource } from "@/data-sources/sources/transitive-form";
import type { DataNode, DataSource, DataSourceContext } from "@/data-sources/types";
import { buildAncestorIndex } from "@/domain/graph";
import { buildLookups } from "@/domain/lookups";
import { GraphSchema } from "@/domain/schema";
import { describe, expect, it } from "vitest";
import mockGraphJson from "./fixtures/graph.json";
import { nodeFinder } from "./helpers";

const graph = GraphSchema.parse(mockGraphJson);
const ancestors = buildAncestorIndex(graph);
const { nodesById, formsById } = buildLookups(graph);
const { idByName } = nodeFinder(graph);

const ctxFor = (targetName: string): DataSourceContext => ({
  graph,
  targetNodeId: idByName(targetName),
  ancestors,
  nodesById,
  formsById,
});

const asGroup = (n: DataNode | undefined): Extract<DataNode, { kind: "group" }> => {
  if (!n || n.kind !== "group") {
    throw new Error(`expected group, got ${n?.kind ?? "undefined"}`);
  }
  return n;
};

describe("DirectFormSource", () => {
  it("Returns one group per direct ancestor with one leaf per field", () => {
    const tree = DirectFormSource.getTree(ctxFor("Form D"));
    expect(tree).toHaveLength(1);
    const group = asGroup(tree[0]);

    expect(group.label).toBe("Form B");
    expect(group.children).toHaveLength(8);
    expect(group.children.every((c) => c.kind === "leaf")).toBe(true);
  });

  it("Returns no groups for a root form", () =>
    expect(DirectFormSource.getTree(ctxFor("Form A"))).toHaveLength(0));
});

describe("TransitiveFormSource", () => {
  it("Returns transitive ancestors only — excludes direct prerequisites", () => {
    const tree = TransitiveFormSource.getTree(ctxFor("Form D"));
    expect(tree.map((n) => n.label)).toEqual(["Form A"]);
  });

  it("Surfaces A, B, C as transitive for the diamond join (NOT direct D, E)", () => {
    const tree = TransitiveFormSource.getTree(ctxFor("Form F"));
    const labels = tree.map((n) => n.label).sort();

    expect(labels).toEqual(["Form A", "Form B", "Form C"]);
    expect(labels).not.toContain("Form D");
    expect(labels).not.toContain("Form E");
  });

  it("Returns no groups for a root form", () =>
    expect(TransitiveFormSource.getTree(ctxFor("Form A"))).toHaveLength(0));
});

describe("ActionPropertiesSource", () => {
  it("Returns one group with three action.* leaves", () => {
    const tree = ActionPropertiesSource.getTree(ctxFor("Form A"));
    expect(tree).toHaveLength(1);
    const group = asGroup(tree[0]);

    expect(group.label).toBe("Action Properties");
    expect(group.children.map((l) => l.label)).toEqual([
      "action.id",
      "action.created_at",
      "action.tenant_id",
    ]);
  });
});

describe("ClientOrgPropertiesSource", () => {
  it("Returns one group with three org.* leaves", () => {
    const tree = ClientOrgPropertiesSource.getTree(ctxFor("Form A"));
    expect(tree).toHaveLength(1);
    const group = asGroup(tree[0]);

    expect(group.label).toBe("Client Organisation Properties");
    expect(group.children.map((l) => l.label)).toEqual(["org.id", "org.name", "org.country"]);
  });
});

describe("collectTree", () => {
  it("Produces Form D's tree in registration order with no cross-source duplicate ids", async () => {
    const tree = await collectTree(ctxFor("Form D"));

    expect(tree.map((g) => g.label)).toEqual([
      "Action Properties",
      "Client Organisation Properties",
      "Form B",
      "Form A",
    ]);

    const ids = tree.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("Awaits getTreeAsync sources alongside sync sources", async () => {
    let asyncCalled = false;
    const asyncProbe: DataSource = {
      id: "test-async-probe",
      label: "Async Probe",
      getTree: () => [],
      getTreeAsync: async () => {
        asyncCalled = true;
        return [];
      },
    };
    register(asyncProbe);

    try {
      await collectTree(ctxFor("Form D"));
      expect(asyncCalled).toBe(true);
    } finally {
      unregister(asyncProbe.id);
    }
  });
});
