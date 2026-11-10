"use client";

import type { MouseEvent, RefObject } from "react";
import Link from "next/link";
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
import { MOBILE_NAV_ID } from "./MobileNav";

type MobileNavDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
  /** The element that opened the drawer, so focus can return to it. */
  opener: RefObject<HTMLElement | null>;
  /** Runs before a drawer link navigates, so the provider can close the drawer. */
  onLinkClick: (event: MouseEvent<HTMLAnchorElement>) => void;
};

/**
 * The phone menu itself. Kept in its own module and loaded by MobileNav with
 * next/dynamic, so the Radix dialog code and the theme control only reach a
 * route once someone reaches for the menu. The embed cards never do.
 *
 * Links replace the history entry the open drawer pushed (see MobileNav), so
 * following one leaves no extra Back step behind.
 */
export default function MobileNavDrawer({ open, onOpenChange, pathname, opener, onLinkClick }: MobileNavDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            replace
            aria-label="UCIP home"
            onClick={onLinkClick}
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
                replace
                aria-current={active ? "page" : undefined}
                onClick={onLinkClick}
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
  );
}
