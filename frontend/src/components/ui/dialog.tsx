"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Hand-written rather than generated with `npx shadcn add dialog`: that command
 * regenerates globals.css with shadcn's generic gray token scheme, overwriting
 * the brand OKLCH palette (including --background going pure white, which
 * breaks the never-pure-white rule) and can reintroduce Geist. See DESIGN.md.
 *
 * No new dependency either: the unified `radix-ui` package already in
 * package.json bundles react-dialog, react-portal and react-dismissable-layer.
 *
 * z-index note: the dashboard's map chrome (layer switcher, legend, error
 * banner) sits at z-map-chrome (1000) and Leaflet's own panes run 400 to 700,
 * so the overlay and content use z-overlay (2000) to clear all of it.
 */

const DIALOG_Z = "z-overlay"

export type DialogPlacement = "center" | "right" | "bottom" | "phone-bottom"

/**
 * Where the content sits and how it enters. `center` is the original box and
 * the default. `right` and `bottom` are sheets pinned to an edge that slide in
 * from it; `phone-bottom` is the bottom sheet below md and the centred box from
 * md up. Every class is spelled out in full so Tailwind's scanner finds it.
 *
 * Sheets move at the sheet duration and easing, and their scrim fades at the
 * same pace so it does not finish before the panel does.
 */
const PLACEMENTS: Record<DialogPlacement, { content: string; overlay: string }> = {
  center: {
    content: cn(
      "top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2",
      // dvh, not vh: vh ignores mobile browser chrome, and browser zoom
      // shrinks the viewport, so a fixed vh cap let the box run past the
      // top and bottom edges with its header and footer unreachable. The
      // calc keeps a visible margin at every zoom level.
      "max-h-[min(85dvh,100dvh-2rem)] rounded-xl border border-border",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
    ),
    overlay: "",
  },
  right: {
    content: cn(
      "inset-y-0 right-0 h-dvh rounded-l-xl border-l border-border",
      "duration-sheet ease-sheet data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right"
    ),
    overlay: "duration-sheet ease-sheet",
  },
  bottom: {
    content: cn(
      "inset-x-0 bottom-0 max-h-[min(85dvh,100dvh-2rem)] rounded-t-xl border-t border-border",
      "duration-sheet ease-sheet data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom"
    ),
    overlay: "duration-sheet ease-sheet",
  },
  "phone-bottom": {
    content: cn(
      "max-h-[min(85dvh,100dvh-2rem)] border-border",
      "max-md:inset-x-0 max-md:bottom-0 max-md:rounded-t-xl max-md:border-t",
      "md:top-1/2 md:left-1/2 md:w-[calc(100%-2rem)] md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border",
      "max-md:duration-sheet max-md:ease-sheet max-md:data-[state=open]:slide-in-from-bottom max-md:data-[state=closed]:slide-out-to-bottom",
      "md:data-[state=closed]:fade-out-0 md:data-[state=open]:fade-in-0 md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95"
    ),
    overlay: "max-md:duration-sheet max-md:ease-sheet",
  },
}

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal(props: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        DIALOG_Z,
        "fixed inset-0 bg-ink/50",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  showOverlay = true,
  placement = "center",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  /**
   * When `false`, the built-in × close button is omitted. The caller MUST
   * provide an alternative close affordance (e.g. a `DialogClose` wrapper
   * or a header button calling `onOpenChange(false)`). Without one the
   * dialog is keyboard-trapped — Escape still works but discoverability
   * suffers. See WardDialog for the intended pattern.
   */
  showCloseButton?: boolean
  /** Drop the scrim to let the content float over a still-visible, still
   *  interactive page. Pair with `modal={false}` on the Dialog root. */
  showOverlay?: boolean
  /** Where the content sits and how it enters. See PLACEMENTS. */
  placement?: DialogPlacement
}) {
  return (
    <DialogPortal>
      {showOverlay && <DialogOverlay className={PLACEMENTS[placement].overlay} />}
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          DIALOG_Z,
          "fixed flex flex-col overflow-hidden bg-background shadow-lg",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          PLACEMENTS[placement].content,
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground opacity-80 transition-opacity hover:bg-accent hover:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("shrink-0 border-b border-border px-6 py-4 pr-14", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("shrink-0 border-t border-border px-5 py-3", className)}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
