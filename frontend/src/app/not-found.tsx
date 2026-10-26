import Link from "next/link";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <p className="font-mono text-sm font-semibold text-brand-teal">404 · PAGE NOT FOUND</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-3 max-w-lg text-muted-foreground">
          The link may be outdated, or the address may have been typed incorrectly. Head back to the dashboard to explore Mumbai&apos;s wards.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
      <SiteFooter />
    </div>
  );
}
