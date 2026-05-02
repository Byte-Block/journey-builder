/**
 * Vitest setup file — runs before every test file.
 *
 * Imports @testing-library/jest-dom matchers (toBeInTheDocument,
 * toHaveAttribute, etc.) so they're available without each test file
 * having to import them.
 *
 * Also registers RTL's cleanup() in afterEach. We run with globals: false,
 * so RTL's built-in auto-cleanup (which depends on the global afterEach)
 * doesn't engage — without this hook, mounted components would leak DOM
 * across tests in the same file.
 */
import "@testing-library/jest-dom/vitest";
// Side-effect type augmentation: registers vitest-axe matchers on Vi.Assertion
// so toHaveNoViolations() typechecks alongside its runtime registration below.
import "vitest-axe/extend-expect";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";

// Register vitest-axe's toHaveNoViolations matcher project-wide so any
// component test can assert axe-clean rendering without re-importing.
expect.extend(axeMatchers);

afterEach(cleanup);
