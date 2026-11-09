"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import WardDetail from "./WardDetail";
import WardDetailHeader from "./WardDetailHeader";
import WardStaticMap from "./WardStaticMap";
import WardTrend from "./WardTrend";
import { useWardData } from "@/lib/useWardData";

/**
 * The ward profile for the two cases with no sidebar to hand over: fullscreen,
 * which unmounts the aside, and viewports below `md`, where the aside is
 * hidden. Everywhere else WardPanel shows the same content in place.
 *
 * Open state is derived from the URL's `?ward=` param, which dashboard/DashboardClient.tsx
 * owns, so there is no second source of truth for selection and browser Back
 * still steps through selections.
 */
export default function WardDialog({
  selectedWardId,
  onSelectWard,
  enabled,
}: {
  selectedWardId: string | null;
  onSelectWard: (wardId: string | null) => void;
  /** False whenever the sidebar is showing the ward instead. */
  enabled: boolean;
}) {
  const { wards, recs, profiles, intervals, error } = useWardData();

  // The URL clears `selectedWardId` the moment the sheet starts closing, but the
  // sheet is still on screen for its exit animation. Render from the last ward
  // that was selected so it does not flash "Loading ward…" on the way out. State
  // adjusted during render, as in MobileNav, because lint forbids writing a ref
  // there.
  const [lastWardId, setLastWardId] = useState(selectedWardId);
  if (selectedWardId && selectedWardId !== lastWardId) setLastWardId(selectedWardId);
  const wardId = selectedWardId ?? lastWardId;

  const selected = wards?.find((f) => f.properties.ward_id === wardId) ?? null;
  const props = selected?.properties;
  const wardRecs = wardId
    ? (recs ?? [])
        .filter((r) => r.ward_id === wardId)
        .sort((a, b) => a.priority - b.priority)
    : [];
  const totalWards = profiles?.n_wards ?? wards?.length ?? 24;

  return (
    <Dialog
      open={enabled && Boolean(selectedWardId)}
      onOpenChange={(open: boolean) => {
        if (!open) onSelectWard(null);
      }}
    >
      <DialogContent
        aria-describedby="ward-dialog-description"
        aria-labelledby="ward-dialog-title"
        showCloseButton={false}
        placement="phone-bottom"
        // Full-width sheet on phones, so the width cap starts at md. The height
        // cap rises to 90dvh on phones only; desktop keeps the placement's.
        className="max-md:max-h-[90dvh] md:max-w-md"
      >
        <DialogDescription id="ward-dialog-description" className="sr-only">
          Detailed heat vulnerability index, greening data, and recommended
          interventions for the selected Mumbai ward.
        </DialogDescription>
        {props ? (
          <WardDetailHeader
            ward={props}
            totalWards={totalWards}
            onClose={() => onSelectWard(null)}
          interval={intervals.get(props.ward_id)}
            titleId="ward-dialog-title"
          />
        ) : (
          <DialogTitle id="ward-dialog-title" className="px-4 py-3">
            Ward {wardId}
          </DialogTitle>
        )}

        <div className="ward-scroll min-h-0 flex-1 overflow-y-auto">
          {error && (
            <p className="px-4 py-4 text-sm text-destructive">Failed to load ward data: {error}</p>
          )}
          {!error && !props && (
            <p className="px-4 py-4 text-sm text-muted-foreground">Loading ward…</p>
          )}
          {props && (
            <>
              {selected.geometry && <WardStaticMap geometry={selected.geometry} hvi={props.HVI} label={`Ward ${props.ward_id}`} />}
              <WardDetail
                ward={props}
                profile={profiles?.wards.find((w) => w.ward_id === props.ward_id) ?? null}
                city={profiles?.city ?? null}
                recs={wardRecs}
                totalWards={totalWards}
                onSelectWard={onSelectWard}
              />
              {/* Multi-year trend (issue #89). Renders nothing when the time
                  series is absent, so a checkout without a stage 14 run shows
                  the dialog exactly as before. */}
              <div className="px-4 pb-4">
                <WardTrend wardId={props.ward_id} />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
