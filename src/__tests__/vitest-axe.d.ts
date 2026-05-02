// Augments vitest's exported Assertion module with vitest-axe's matchers.
// vitest-axe ships an extend-expect.d.ts that augments the legacy Vi.* global
// namespace, but modern vitest reads matchers from the `vitest` module's
// own Assertion interface — this declaration covers both.
//
// The eslint-disables below are intrinsic to declaration merging:
//   - interface ... extends ... {} is the only shape that merges into the
//     existing module; type aliases don't merge.
//   - Assertion's generic T must mirror vitest's Assertion<T = any> signature
//     for the merge to succeed, even though the body doesn't reference T.
/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T = unknown> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
