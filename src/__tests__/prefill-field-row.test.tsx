import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider, createStore } from "jotai";
import { Profiler, type ProfilerOnRenderCallback } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { PrefillFieldRow } from "@/components/PrefillFieldRow";
import { buildLookups } from "@/domain/lookups";
import { GraphSchema } from "@/domain/schema";
import { fieldMappingFamily } from "@/state/atoms";
import type { PrefillRef } from "@/domain/types";

import mockGraphJson from "./fixtures/graph.json";
import { nodeFinder } from "./helpers";

const graph = GraphSchema.parse(mockGraphJson);
const lookups = buildLookups(graph);
const { idByName } = nodeFinder(graph);

afterEach(() => {
  // atomFamily is module-level — clearing the store doesn't reset family
  // entries, but each test constructs its own store so atom values isolate.
  // No restoreAllMocks needed since these tests don't spy.
});

const renderRow = (override: Partial<Parameters<typeof PrefillFieldRow>[0]> = {}) => {
  const formAId = idByName("Form A");
  const defaultProps: Parameters<typeof PrefillFieldRow>[0] = {
    fieldKey: "email",
    fieldAtom: fieldMappingFamily({ nodeId: formAId, fieldKey: "email" }),
    lookups,
    onOpenModal: () => {},
  };
  const store = createStore();
  return {
    store,
    ...render(
      <Provider store={store}>
        <PrefillFieldRow {...defaultProps} {...override} />
      </Provider>,
    ),
  };
};

describe("PrefillFieldRow", () => {
  it("Renders the field key as a button when no mapping is set", () => {
    renderRow();

    expect(screen.getByRole("button")).toHaveTextContent("email");
  });

  it("Calls onOpenModal with the field key when the empty row is clicked", async () => {
    const user = userEvent.setup();
    const opened: string[] = [];

    renderRow({ fieldKey: "name", onOpenModal: (k) => opened.push(k) });

    await user.click(screen.getByRole("button"));
    expect(opened).toEqual(["name"]);
  });

  it("Activates the empty button on Enter and Space (native button keyboard)", async () => {
    const user = userEvent.setup();
    const opened: string[] = [];

    renderRow({ fieldKey: "email", onOpenModal: (k) => opened.push(k) });

    await user.tab();
    await user.keyboard("{Enter}");
    expect(opened).toEqual(["email"]);

    await user.keyboard(" ");
    expect(opened).toEqual(["email", "email"]);
  });

  it("Renders 'fieldKey: SourceName.field' when mapped to a form_field ref", () => {
    const formAId = idByName("Form A");
    const formBId = idByName("Form B");
    const atom = fieldMappingFamily({ nodeId: formAId, fieldKey: "email" });
    const ref: PrefillRef = { type: "form_field", nodeId: formBId, fieldKey: "name" };

    const { store } = renderRow({ fieldAtom: atom });
    act(() => {
      store.set(atom, ref);
    });

    expect(screen.getByText(/email: Form B\.name/)).toBeInTheDocument();
  });

  it("Renders 'fieldKey: ScopeLabel.key' when mapped to a global ref", () => {
    const formAId = idByName("Form A");
    const atom = fieldMappingFamily({ nodeId: formAId, fieldKey: "email" });
    const ref: PrefillRef = { type: "global", scope: "action", key: "id" };

    const { store } = renderRow({ fieldAtom: atom });
    act(() => {
      store.set(atom, ref);
    });

    expect(screen.getByText(/email: Action Properties\.id/)).toBeInTheDocument();
  });

  it("Clears the mapping when the X button is clicked", async () => {
    const user = userEvent.setup();
    const formAId = idByName("Form A");
    const atom = fieldMappingFamily({ nodeId: formAId, fieldKey: "email" });
    const ref: PrefillRef = { type: "form_field", nodeId: formAId, fieldKey: "name" };

    const { store } = renderRow({ fieldAtom: atom });
    act(() => {
      store.set(atom, ref);
    });

    await user.click(screen.getByRole("button", { name: /clear email mapping/i }));

    expect(store.get(atom)).toBeNull();
  });

  it("Updates only the touched cell — atomic subscription via family atom", () => {
    const store = createStore();
    const formAId = idByName("Form A");
    const formBId = idByName("Form B");

    let countA = 0;
    let countB = 0;
    const onRenderA: ProfilerOnRenderCallback = () => {
      countA++;
    };
    const onRenderB: ProfilerOnRenderCallback = () => {
      countB++;
    };

    const atomA = fieldMappingFamily({ nodeId: formAId, fieldKey: "email" });
    const atomB = fieldMappingFamily({ nodeId: formBId, fieldKey: "email" });

    render(
      <Provider store={store}>
        <Profiler id="A" onRender={onRenderA}>
          <PrefillFieldRow
            fieldKey="email"
            fieldAtom={atomA}
            lookups={lookups}
            onOpenModal={() => {}}
          />
        </Profiler>
        <Profiler id="B" onRender={onRenderB}>
          <PrefillFieldRow
            fieldKey="email"
            fieldAtom={atomB}
            lookups={lookups}
            onOpenModal={() => {}}
          />
        </Profiler>
      </Provider>,
    );

    const baselineA = countA;
    const baselineB = countB;

    const ref: PrefillRef = { type: "global", scope: "action", key: "id" };
    act(() => {
      store.set(atomA, ref);
    });

    expect(countA).toBeGreaterThan(baselineA);
    expect(countB).toBe(baselineB);
  });
});
