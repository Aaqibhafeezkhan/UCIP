"use client";

import { useState, type ComponentProps } from "react";
import { List } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import WardPanel from "./WardPanel";

type WardPanelProps = ComponentProps<typeof WardPanel>;

/**
 * The ranked, searchable ward list for viewports below `md` (issue #199).
 *
 * The sidebar `<aside>` that holds WardPanel is hidden there, which left a phone
 * with no way to find a ward by name or browse the ranking, and removed the
 * accessible equivalent of the map for keyboard and screen-reader users on narrow
 * screens. This puts the same list in a bottom sheet built on the shared Dialog,
 * opened from a button over the map. Radix returns focus to that button on close,
 * Escape closes the sheet, and choosing a ward closes it and hands the selection
 * to WardDialog, which is what shows a ward on a narrow screen.
 */
export default function WardListSheet({
  onSelectWard,
  ...panelProps
}: Omit<WardPanelProps, "selectedWardId">) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="absolute right-safe-2 bottom-6 z-map-chrome flex items-center gap-1.5 rounded-md border border-border bg-background/95 px-3 py-2 max-md:min-h-11 text-sm font-medium text-foreground shadow-sm backdrop-blur-sm hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring md:hidden"
        >
          <List className="h-4 w-4" aria-hidden />
          Wards
        </button>
      </DialogTrigger>
      <DialogContent
        placement="bottom"
        className="h-[80dvh] max-h-[80dvh] w-full"
        aria-describedby="ward-sheet-description"
      >
        <DialogTitle className="sr-only">Ward list</DialogTitle>
        <DialogDescription id="ward-sheet-description" className="sr-only">
          All wards ranked by heat vulnerability. Search by ward code or area, then
          choose a ward to open its profile.
        </DialogDescription>
        <div className="min-h-0 flex-1 pt-8">
          <WardPanel
            {...panelProps}
            selectedWardId={null}
            onSelectWard={(wardId) => {
              setOpen(false);
              onSelectWard(wardId);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
