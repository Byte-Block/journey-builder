// Factory that returns a key-scoped console.warn dedupe function. Each
// returned callback maintains its own private Set so callers don't step on
// each other's keys. Designed for surfacing-without-spamming defensive
// paths and stale-state diagnostics. Keys should uniquely identify what
// the warn is about (node id, form id, etc.).
export function createWarnOnce(): (key: string, message: string) => void {
  const warned = new Set<string>();
  return (key, message) => {
    if (warned.has(key)) {
      return;
    }
    warned.add(key);
    console.warn(message);
  };
}
