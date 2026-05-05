import type { DataSource } from "@/data-sources/types";

const sources = new Map<string, DataSource>();

export function register(source: DataSource): void {
  sources.set(source.id, source);
}

export function unregister(id: string): void {
  sources.delete(id);
}

export function list(): readonly DataSource[] {
  return [...sources.values()];
}
