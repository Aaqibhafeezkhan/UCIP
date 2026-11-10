import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

/**
 * Header, page content and footer in one full-height column. `svh` rather than
 * `vh`, so a phone's collapsing address bar never pushes the footer off screen.
 * The dashboard and the embed card deliberately stay outside this.
 */
export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}

const WIDTHS = {
  prose: "max-w-3xl",
  wide: "max-w-5xl",
} as const;

/** The page's `<main>`: centred at a reading or a table width, with the shared gutters. */
export function PageContainer({
  width = "prose",
  children,
}: {
  width?: keyof typeof WIDTHS;
  children: React.ReactNode;
}) {
  return (
    <main className={`mx-auto w-full flex-1 px-safe-4 py-8 sm:px-safe-6 md:py-14 ${WIDTHS[width]}`}>
      {children}
    </main>
  );
}
