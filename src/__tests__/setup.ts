import "@testing-library/jest-dom/vitest";
import "vitest-axe/extend-expect";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";

// Register vitest-axe's toHaveNoViolations matcher project-wide so any
// component test can assert axe-clean rendering without re-importing.
expect.extend(axeMatchers);

afterEach(cleanup);
