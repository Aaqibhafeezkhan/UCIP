"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    posthog.captureException(error, { boundary: "global", digest: error.digest });
    console.error("Global render error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "#fafafa",
          color: "#111827",
          fontFamily: "Arial, Helvetica, sans-serif",
          textAlign: "center",
        }}
      >
        <main style={{ maxWidth: "32rem" }}>
          <p style={{ color: "#0e8792", fontSize: "0.875rem", fontWeight: 600 }}>
            UCIP
          </p>
          <h1 style={{ fontSize: "1.75rem" }}>Something went wrong</h1>
          <p style={{ lineHeight: 1.6 }}>
            An unexpected error stopped the page from loading. You can try again or return to the dashboard.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button
              onClick={reset}
              style={{
                cursor: "pointer",
                border: 0,
                borderRadius: "0.375rem",
                padding: "0.625rem 1rem",
                background: "#0e8792",
                color: "#fff",
                fontWeight: 600,
              }}
            >
              Try again
            </button>
            <a
              href="/dashboard"
              style={{
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                padding: "0.625rem 1rem",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              Go to dashboard
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
