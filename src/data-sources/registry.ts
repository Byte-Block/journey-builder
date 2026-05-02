import type { DataSource } from "@/data-sources/types";

const sources = new Map<string, DataSource>();

// Idempotent — same id replaces in place; Map preserves original insertion position.
export function register(source: DataSource): void {
  sources.set(source.id, source);
}

// No-op when id is unknown.
export function unregister(id: string): void {
  sources.delete(id);
}

// Iteration order matches registration order.
export function list(): readonly DataSource[] {
  return [...sources.values()];
}
