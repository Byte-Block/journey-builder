"use client";

import { useEffect } from "react";

import { ErrorFallback } from "@/components/error/ErrorFallback";

type Props = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

// Route-level error boundary (outer net). Catches throws from app/page.tsx's
// RSC render — env-var failures, fetch errors, schema parse errors. Client
// render errors below JourneyBuilder are caught earlier by the inner
// <ErrorBoundary> in layout.tsx.
//
// We use unstable_retry instead of reset because reset alone re-mounts this
// component without re-fetching the RSC; unstable_retry calls
// router.refresh() then reset, which actually retries the failed server
// fetch. Swap to the stable name when Next renames it.
export default function Error({ error, unstable_retry }: Props) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return <ErrorFallback error={error} retry={unstable_retry} />;
}
