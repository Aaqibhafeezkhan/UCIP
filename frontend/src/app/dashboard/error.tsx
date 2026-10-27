"use client";

import { Button } from "@/components/ui/button";
import { useBoundaryErrorReporting } from "@/lib/reportBoundaryError";

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useBoundaryErrorReporting(error, "dashboard");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The dashboard hit an unexpected error. Try reloading, if it keeps happening
        let us know.
      </p>
      <Button onClick={retry}>Try again</Button>
    </div>
  );
}
