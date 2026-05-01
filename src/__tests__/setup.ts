/**
 * Vitest setup file — runs before every test file.
 *
 * Imports @testing-library/jest-dom matchers (toBeInTheDocument,
 * toHaveAttribute, etc.) so they're available without each test file
 * having to import them.
 */
import "@testing-library/jest-dom/vitest";
