"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

type BoundaryName = "app" | "global" | "dashboard";

export function useBoundaryErrorReporting(
  error: Error & { digest?: string },
  boundary: BoundaryName
) {
  useEffect(() => {
    posthog.captureException(error, { boundary, digest: error.digest });
    console.error(`${boundary} render error:`, error);
  }, [error, boundary]);
}
