"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, MouseEvent } from "react";
import { usePathname } from "next/navigation";
import type { MobileNavDrawerProps } from "./MobileNavDrawer";

/** The `md` breakpoint, where the header swaps the hamburger for the inline nav. */
const DESKTOP_QUERY = "(min-width: 48rem)";

/** Marks the history entry the open drawer adds, so Back can close it. */
const MENU_HISTORY_KEY = "ucipMobileNav";

// The drawer (and with it the Radix dialog code and the theme control) is
// fetched on first use instead of shipping with every route, so the embed
// cards, which never open it, don't pay for it. This is an explicit import, not
// next/dynamic: dynamic is React.lazy, so a failed fetch (offline, a flaky
// network, a chunk that was never cached) would throw while the provider
// renders, above every error boundary except global-error, and the lazy
// component would keep the rejection. Here a failure is caught, and a later tap
// imports again.
function loadDrawer() {
  return import("./MobileNavDrawer");
}

/** Starts fetching the drawer before it is needed: the header calls this when
    the browser is idle and the hamburger on pointerdown and focus, so the code
    is there by the time the tap lands. A failure is ignored here, the tap that
    needs the drawer tries again. */
function preloadMenu() {
  loadDrawer().catch(() => {});
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
 * and a link to another page replaces it, so the menu never leaves an extra
 * Back step. The link to the page you are already on only closes the drawer and
 * navigates nowhere, so the dashboard's ward, layer and map params survive. The
 * entry keeps the URL as it is, for the same reason.
 */
export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // The drawer's component, once its code has loaded.
  const [Drawer, setDrawer] = useState<ComponentType<MobileNavDrawerProps> | null>(null);
  const [lastPathname, setLastPathname] = useState(pathname);
  const opener = useRef<HTMLElement | null>(null);
  // True while the history entry the drawer pushed is the current one. After a
  // reload or a Forward onto an old entry it is false, and that entry is then a
  // plain duplicate of its page: one extra Back step that does nothing visible.
  // That is accepted. Android has no Forward, and a reload with the menu open
  // is rare, so no extra machinery is worth it.
  const menuEntry = useRef(false);
  // Which open is waiting on the drawer's code, so a late failure from an
  // earlier tap cannot close a menu the user has since opened again.
  const loadAttempt = useRef(0);

  // Adjusting state while rendering, not in an effect: a navigation closes the
  // drawer in the same pass instead of one frame after the new page paints.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  // A navigation the drawer did not make leaves its entry buried below the new
  // page's, so the entry is no longer the current one. Reset on the commit, as
  // refs are not written while rendering.
  useEffect(() => {
    menuEntry.current = false;
  }, [pathname]);

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
      if (target.pathname === window.location.pathname) {
        // The page you are already on: close without navigating. Pathname only,
        // because the dashboard's URL nearly always carries lat, lng, zoom or
        // layer while the link is the bare path, and navigating would drop the
        // ward, layer and map the person is looking at.
        event.preventDefault();
        dismiss();
        return;
      }
      // Another page: the link replaces the drawer's history entry, so there
      // is none to pop.
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
        setOpen(true);
        const attempt = ++loadAttempt.current;
        loadDrawer()
          .then((module) => setDrawer(() => module.default))
          // The code did not arrive: close again, which also takes the entry
          // just pushed back off, so the page stays usable and the next tap
          // tries the import afresh.
          .catch(() => {
            if (loadAttempt.current === attempt) dismiss();
          });
      },
      preloadMenu,
    }),
    [open, dismiss]
  );

  return (
    <MobileNavContext.Provider value={value}>
      {children}
      {Drawer && (
        <Drawer
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
