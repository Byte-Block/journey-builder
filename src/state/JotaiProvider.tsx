"use client";

import { Provider } from "jotai";
import type { ReactNode } from "react";

// Thin client-only wrapper so layout.tsx (RSC) can mount Jotai's Provider
// without itself becoming a Client Component. Atoms throughout the app
// resolve against this provider's store; tests mount their own <Provider>
// for isolation per atoms-subscription.test.tsx.
export function JotaiProvider({ children }: { children: ReactNode }) {
  return <Provider>{children}</Provider>;
}
