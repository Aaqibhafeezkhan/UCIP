"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

/** The drawer's id, so the header's hamburger can point `aria-controls` at it. */
export const MOBILE_NAV_ID = "mobile-nav";

/** The `md` breakpoint, where the header swaps the hamburger for the inline nav. */
const DESKTOP_QUERY = "(min-width: 48rem)";

/** Marks the history entry the open drawer adds, so Back can close it. */
const MENU_HISTORY_KEY = "ucipMobileNav";

// The drawer (and with it the Radix dialog code and the theme control) is
// fetched on first use instead of shipping with every route, so the embed
// cards, which never open it, don't pay for it.
const MobileNavDrawer = dynamic(() => import("./MobileNavDrawer"), { ssr: false });

/** Starts fetching the drawer before it is needed: the hamburger calls this on
    pointerdown and focus, so the code is there by the time the tap lands. */
function preloadMenu() {
  void import("./MobileNavDrawer");
}

type MobileNavContextValue = {
  open: boolean;
  /** Opens the drawer. Pass the element that asked, so focus can return to it. */
  openMenu: (opener?: HTMLElement | null) => void;
  preloadMenu: () => void;
};

// Safe without a provider, so a header rendered in isolation (a test, a story)
// gets a button that does nothing instead of a crash.
const MobileNavContext = createContext<MobileNavContextValue>({
  open: false,
  openMenu: () => {},
  preloadMenu: () => {},
});

export function useMobileNav() {
  return useContext(MobileNavContext);
}

function isPlainLeftClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * Owns the mobile menu for the whole app and renders it once, portalled to
 * <body> by Radix, so no page's header carries its own copy. The drawer is not
 * in the tree until it first opens, which keeps it from existing off-canvas and
 * keeps its code off routes where nobody opens it.
 *
 * Back: opening the drawer pushes one history entry for the same URL, so
 * Android's Back (or the browser's) pops that entry and closes the drawer
 * instead of leaving the page. Closing it any other way pops the entry itself,
 * and a link in the drawer replaces it, so the menu never leaves an extra Back
 * step. The entry keeps the URL as it is, so the dashboard's ward, layer and
 * map params survive.
 */
export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const opener = useRef<HTMLElement | null>(null);
  // True while the history entry the drawer pushed is the current one.
  const menuEntry = useRef(false);

  // Adjusting state while rendering, not in an effect: a navigation closes the
  // drawer in the same pass instead of one frame after the new page paints.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  /** Closes the drawer and takes its history entry back off the stack. */
  const dismiss = useCallback(() => {
    setOpen(false);
    if (menuEntry.current) {
      menuEntry.current = false;
      window.history.back();
    }
  }, []);

  // Back while the drawer is open lands on the entry below the drawer's: same
  // page, so only the drawer needs to go.
  useEffect(() => {
    if (!open) return;
    function onPopState() {
      if (!menuEntry.current) return;
      menuEntry.current = false;
      setOpen(false);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [open]);

  // The hamburger is hidden from md up, so a drawer still open when the
  // viewport grows (rotating a tablet, resizing a window) would be stranded.
  useEffect(() => {
    if (!open) return;
    const mql = window.matchMedia(DESKTOP_QUERY);
    function onChange(event: MediaQueryListEvent) {
      if (event.matches) dismiss();
    }
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [open, dismiss]);

  const onOpenChange = useCallback(
    (next: boolean) => {
      if (next) setOpen(true);
      else dismiss();
    },
    [dismiss]
  );

  const onLinkClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      // A new-tab click navigates nothing here: leave the drawer as it is.
      if (!isPlainLeftClick(event)) return;
      const target = new URL(event.currentTarget.href, window.location.href);
      const here = window.location;
      if (target.pathname === here.pathname && target.search === here.search && target.hash === here.hash) {
        // The page you are already on: nothing to navigate to, so just close.
        event.preventDefault();
        dismiss();
        return;
      }
      // The link replaces the drawer's history entry, so there is none to pop.
      menuEntry.current = false;
      setOpen(false);
    },
    [dismiss]
  );

  const value = useMemo<MobileNavContextValue>(
    () => ({
      open,
      openMenu: (element) => {
        opener.current = element ?? null;
        if (!menuEntry.current) {
          window.history.pushState({ [MENU_HISTORY_KEY]: true }, "", window.location.href);
          menuEntry.current = true;
        }
        setMounted(true);
        setOpen(true);
      },
      preloadMenu,
    }),
    [open]
  );

  return (
    <MobileNavContext.Provider value={value}>
      {children}
      {mounted && (
        <MobileNavDrawer
          open={open}
          onOpenChange={onOpenChange}
          pathname={pathname}
          opener={opener}
          onLinkClick={onLinkClick}
        />
      )}
    </MobileNavContext.Provider>
  );
}
