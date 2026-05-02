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
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);
