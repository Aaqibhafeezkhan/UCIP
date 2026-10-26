"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useBoundaryErrorReporting } from "@/lib/reportBoundaryError";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useBoundaryErrorReporting(error, "app");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        This page hit an unexpected error. Try again, and return to the dashboard if the problem continues.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={retry}>Try again</Button>
        <Link
          href="/dashboard"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
