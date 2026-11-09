"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { MOBILE_NAV_ID, useMobileNav } from "./MobileNav";
import { NAV_ROUTES, isActiveRoute } from "@/lib/routes";

export default function SiteHeader({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const { open, openMenu } = useMobileNav();

  return (
    <header className="sticky top-0 z-header border-b border-border bg-background/95">
      <div
        className={`mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 ${
          compact ? "py-2" : "max-w-5xl py-3"
        }`}
      >
        <Link href="/" aria-label="UCIP home">
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
          className="rounded border border-border p-1.5 text-muted-foreground md:hidden"
          onClick={(event) => openMenu(event.currentTarget)}
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
