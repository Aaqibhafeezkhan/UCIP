"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { useMobileNav } from "./MobileNav";
import { MOBILE_NAV_ID } from "./mobileNavId";
import { NAV_ROUTES, isActiveRoute } from "@/lib/routes";

/** The `md` breakpoint, where this header swaps the hamburger for the inline nav. */
const DESKTOP_QUERY = "(min-width: 48rem)";
/** Where there is no requestIdleCallback (Safari), wait this long after mount. */
const IDLE_FALLBACK_MS = 2000;

export default function SiteHeader({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const { open, openMenu, preloadMenu } = useMobileNav();

  // On a phone, fetch the drawer's code once the page has settled, so even a
  // first tap on a slow connection finds it already there. Never on md and up,
  // which has no hamburger, and never on the embed cards, which have no header,
  // so they keep the saving from loading the drawer on demand.
  useEffect(() => {
    if (typeof window.matchMedia !== "function" || window.matchMedia(DESKTOP_QUERY).matches) return;
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(preloadMenu);
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(preloadMenu, IDLE_FALLBACK_MS);
    return () => window.clearTimeout(id);
  }, [preloadMenu]);

  return (
    <header className="sticky top-0 z-header border-b border-border bg-background/95 pt-safe">
      <div
        className={`mx-auto flex items-center justify-between gap-4 px-safe-4 sm:px-safe-6 ${
          compact ? "py-2" : "max-w-5xl py-3"
        }`}
      >
        <Link href="/" aria-label="UCIP home" className="relative before:absolute before:-inset-y-2 before:inset-x-0 md:before:hidden">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV_ROUTES.map((item) => {
            const active = isActiveRoute(pathname, item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                aria-current={active ? "page" : undefined}
                className={`rounded px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <ThemeToggle />
        </div>

        <button
          // The before: layer lifts the 34 px box to a 44 px hit area without changing its look.
          className="relative rounded border border-border p-1.5 text-muted-foreground before:absolute before:-inset-1.5 md:hidden"
          onClick={(event) => openMenu(event.currentTarget)}
          // Fetch the drawer's code as the finger lands or focus arrives, so
          // it is ready by the click and opening has no visible delay.
          onPointerDown={preloadMenu}
          onFocus={preloadMenu}
          aria-expanded={open}
          aria-controls={MOBILE_NAV_ID}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
