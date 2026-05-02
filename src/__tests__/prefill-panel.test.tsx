import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PrefillPanel } from "@/components/PrefillPanel";
import { GraphSchema } from "@/domain/schema";

import mockGraphJson from "./fixtures/graph.json";
import { nodeFinder } from "./helpers";

const graph = GraphSchema.parse(mockGraphJson);
const { byName, idByName } = nodeFinder(graph);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PrefillPanel", () => {
  it("Renders nothing when no form is selected", () => {
    const { container } = render(<PrefillPanel graph={graph} selectedNodeId={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("Renders header and one row per field for the selected form", () => {
    render(<PrefillPanel graph={graph} selectedNodeId={idByName("Form A")} />);

    expect(screen.getByText("Prefill")).toBeInTheDocument();
    expect(screen.getByText("Prefill fields for this form")).toBeInTheDocument();

    // Field count derived from fixture so the test stays self-validating
    // if the mock graph adds/removes fields.
    const formId = byName("Form A").data.component_id;
    const form = graph.forms.find((f) => f.id == formId);
    if (!form) {
      throw new Error("Test fixture missing form for Form A node");
    }
    const expectedFields = Object.keys(form.field_schema.properties);

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(expectedFields.length);

    for (const fieldKey of expectedFields) {
      expect(screen.getByText(fieldKey)).toBeInTheDocument();
    }
  });

  it("Renders fields in schema-declared insertion order", () => {
    render(<PrefillPanel graph={graph} selectedNodeId={idByName("Form A")} />);

    const formId = byName("Form A").data.component_id;
    const form = graph.forms.find((f) => f.id == formId);
    if (!form) {
      throw new Error("Test fixture missing form for Form A node");
    }
    const expectedOrder = Object.keys(form.field_schema.properties);
    const renderedOrder = screen.getAllByRole("listitem").map((li) => li.textContent ?? "");

    expect(renderedOrder).toEqual(expectedOrder);
  });

  it("Renders nothing and warns once when selectedNodeId is unknown", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { container, rerender } = render(
      <PrefillPanel graph={graph} selectedNodeId="form-zzz" />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("node form-zzz not in graph"));

    const callsAfterFirst = warn.mock.calls.length;
    rerender(<PrefillPanel graph={graph} selectedNodeId="form-zzz" />);
    expect(warn.mock.calls.length).toBe(callsAfterFirst);
  });

  it("Renders nothing and warns when the node's form is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Strip Form A's FormDef so node lookup succeeds but form lookup misses.
    const formAId = byName("Form A").data.component_id;
    const graphWithoutFormA: typeof graph = {
      ...graph,
      forms: graph.forms.filter((f) => f.id != formAId),
    };

    const { container } = render(
      <PrefillPanel graph={graphWithoutFormA} selectedNodeId={idByName("Form A")} />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(`form ${formAId} not in graph.forms`),
    );
  });
});
