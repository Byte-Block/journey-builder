import { act, render } from "@testing-library/react";
import { Provider, createStore, useAtomValue } from "jotai";
import { afterEach, describe, expect, it } from "vitest";

import type { PrefillRef } from "@/domain/types";
import { fieldMappingFamily } from "@/state/atoms";

afterEach(() => {
  window.localStorage.clear();
});

// Render-counter probe. Closure-scoped counter (not useRef) so Strict Mode's
// double-render still increments as expected — relative deltas remain truthful.
const makeProbe = (nodeId: string, fieldKey: string) => {
  let count = 0;
  const Probe = () => {
    count++;
    useAtomValue(fieldMappingFamily({ nodeId, fieldKey }));
    return null;
  };
  return [Probe, () => count] as const;
};

describe("fieldMappingFamily atomic subscription", () => {
  it("Each consumer rerenders only when its own cell updates", () => {
    const [ProbeD, dCount] = makeProbe("D", "email");
    const [ProbeC, cCount] = makeProbe("C", "email");

    const store = createStore();
    render(
      <Provider store={store}>
        <ProbeD />
        <ProbeC />
      </Provider>,
    );

    const afterMountD = dCount();
    const afterMountC = cCount();

    const refD: PrefillRef = { type: "form_field", nodeId: "A", fieldKey: "x" };
    act(() => {
      store.set(fieldMappingFamily({ nodeId: "D", fieldKey: "email" }), refD);
    });
    const afterDsetD = dCount();
    const afterDsetC = cCount();

    const refC: PrefillRef = { type: "form_field", nodeId: "B", fieldKey: "y" };
    act(() => {
      store.set(fieldMappingFamily({ nodeId: "C", fieldKey: "email" }), refC);
    });

    expect(afterDsetD).toBeGreaterThan(afterMountD);
    expect(afterDsetC).toBe(afterMountC);
    expect(cCount()).toBeGreaterThan(afterDsetC);
    expect(dCount()).toBe(afterDsetD);
  });

  it("Clearing one cell does not re-render a sibling cell's consumer", () => {
    const [ProbeD, dCount] = makeProbe("D", "email");
    const [ProbeC, cCount] = makeProbe("C", "email");

    const store = createStore();
    const ref: PrefillRef = { type: "form_field", nodeId: "X", fieldKey: "y" };
    store.set(fieldMappingFamily({ nodeId: "D", fieldKey: "email" }), ref);

    render(
      <Provider store={store}>
        <ProbeD />
        <ProbeC />
      </Provider>,
    );

    const baselineD = dCount();
    const baselineC = cCount();

    act(() => {
      store.set(fieldMappingFamily({ nodeId: "D", fieldKey: "email" }), null);
    });

    expect(dCount()).toBeGreaterThan(baselineD);
    expect(cCount()).toBe(baselineC);
  });
});
