import type { ReactNode } from "react";

type Props = {
  error: Error & { digest?: string };
  retry: () => void;
};

export function ErrorFallback({ error, retry }: Props): ReactNode {
  return (
    <div role="alert">
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button type="button" onClick={retry}>
        Try again
      </button>
      {process.env.NODE_ENV == "development" && (
        <details>
          <summary>Diagnostics (dev only)</summary>
          {error.digest && <p>Digest: {error.digest}</p>}
          {error.stack && <pre>{error.stack}</pre>}
        </details>
      )}
    </div>
  );
}
