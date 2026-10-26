import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 py-20 text-center">
      <p className="font-mono text-sm font-semibold text-brand-teal">404 · PAGE NOT FOUND</p>
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        We couldn&apos;t find that page
      </h1>
      <p className="max-w-lg text-muted-foreground">
        The link may be outdated, or the address may have been typed incorrectly.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-md bg-brand-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-teal-hover"
        >
          Go to dashboard
        </Link>
        <Link
          href="/"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
