import { buildAdjacency, getDirectAncestors } from "@/domain/graph";
import { GraphSchema } from "@/domain/schema";
import { describe, expect, it } from "vitest";
import mockGraphJson from "./fixtures/graph.json";

const mockGraph = GraphSchema.parse(mockGraphJson);
const idByName = new Map<string, string>(mockGraph.nodes.map((n) => [n.data.name, n.id]));

function nodeIdByName(name: string): string {
  const id = idByName.get(name);

  if (!id) {
    throw new Error(`Form "${name}" not found in fixture`);
  }

  return id;
}

describe("getDirectAncestors", () => {
  it.each<[string, string[]]>([
    ["Form A", []],
    ["Form B", ["Form A"]],
    ["Form C", ["Form A"]],
    ["Form D", ["Form B"]],
    ["Form E", ["Form C"]],
    ["Form F", ["Form D", "Form E"]],
  ])("%s has direct ancestors %j", (name, expectedNames) => {
    const id = nodeIdByName(name);
    const expected = new Set(expectedNames.map(nodeIdByName));

    expect(getDirectAncestors(id, mockGraph)).toEqual(expected);
  });

  it("Throws for an unknown node id", () => {
    expect(() => getDirectAncestors("nonexistent-id", mockGraph)).toThrow(/Node not found/);
  });
});

describe("buildAdjacency", () => {
  const adj = buildAdjacency(mockGraph);

  it.each<[string, string[]]>([
    ["Form A", ["Form B", "Form C"]],
    ["Form B", ["Form D"]],
    ["Form C", ["Form E"]],
    ["Form D", ["Form F"]],
    ["Form E", ["Form F"]],
    ["Form F", []],
  ])("%s has children %j", (name, expectedChildNames) => {
    const id = nodeIdByName(name);
    const expected = new Set(expectedChildNames.map(nodeIdByName));

    expect(adj.get(id)).toEqual(expected);
  });
});
