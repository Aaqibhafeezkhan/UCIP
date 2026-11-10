"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { NAV_ROUTES, isActiveRoute } from "@/lib/routes";

/** The drawer's id, so the header's hamburger can point `aria-controls` at it. */
export const MOBILE_NAV_ID = "mobile-nav";

/** The `md` breakpoint, where the header swaps the hamburger for the inline nav. */
const DESKTOP_QUERY = "(min-width: 48rem)";

type MobileNavContextValue = {
  open: boolean;
  /** Opens the drawer. Pass the element that asked, so focus can return to it. */
  openMenu: (opener?: HTMLElement | null) => void;
};

// Safe without a provider, so a header rendered in isolation (a test, a story)
// gets a button that does nothing instead of a crash.
const MobileNavContext = createContext<MobileNavContextValue>({
  open: false,
  openMenu: () => {},
});

export function useMobileNav() {
  return useContext(MobileNavContext);
}

/**
 * Owns the mobile menu for the whole app and renders it once, portalled to
 * <body> by Radix, so no page's header carries its own copy. The drawer is not
 * in the tree until it opens, which keeps it from existing off-canvas.
 */
export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const opener = useRef<HTMLElement | null>(null);

  // Adjusting state while rendering, not in an effect: a navigation closes the
  // drawer in the same pass instead of one frame after the new page paints.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  // The hamburger is hidden from md up, so a drawer still open when the
  // viewport grows (rotating a tablet, resizing a window) would be stranded.
  useEffect(() => {
    if (!open) return;
    const mql = window.matchMedia(DESKTOP_QUERY);
    function onChange(event: MediaQueryListEvent) {
      if (event.matches) setOpen(false);
    }
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [open]);

  const value = useMemo<MobileNavContextValue>(
    () => ({
      open,
      openMenu: (element) => {
        opener.current = element ?? null;
        setOpen(true);
      },
    }),
    [open]
  );

  return (
    <MobileNavContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          id={MOBILE_NAV_ID}
          placement="right"
          showCloseButton={false}
          aria-describedby={undefined}
          className="w-[min(20rem,85vw)]"
          // No DialogTrigger, so Radix has nothing to hand focus back to. The
          // opener may have gone with the page it was on; skip it then.
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
          }}
        >
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-2 py-2">
            {/* The logo takes the title's place on screen. The title stays for the
                dialog's accessible name. */}
            <DialogTitle className="sr-only">Menu</DialogTitle>
            <Link
              href="/"
              aria-label="UCIP home"
              onClick={() => setOpen(false)}
              className="flex h-11 items-center rounded-lg px-2 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring"
            >
              <Logo />
            </Link>
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close menu"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </DialogClose>
          </div>

          <nav aria-label="Main mobile" className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {NAV_ROUTES.map((item) => {
              const active = isActiveRoute(pathname, item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  aria-current={active ? "page" : undefined}
                  // Tapping the page you are already on changes no route, so
                  // the pathname check above never fires. Close here too.
                  onClick={() => setOpen(false)}
                  className={`flex h-12 items-center rounded-lg px-3 text-base transition-colors ${
                    active
                      ? "bg-surface-hover font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex h-14 shrink-0 items-center justify-between border-t border-border px-4">
            <span className="text-sm font-medium text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
        </DialogContent>
      </Dialog>
    </MobileNavContext.Provider>
  );
}
