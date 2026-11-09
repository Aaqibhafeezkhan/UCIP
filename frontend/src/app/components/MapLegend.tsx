import { Card } from "@/components/ui/card";
import type { MapLayer } from "@/lib/mapState";
import { LAYER_META } from "./LayerSwitcher";

type LayerId = MapLayer;

const HVI_LEGEND_BINS = [
  { color: "#ffffb2", label: "Under 20" },
  { color: "#fed976", label: "20-35" },
  { color: "#feb24c", label: "35-50" },
  { color: "#fd8d3c", label: "50-65" },
  { color: "#f03b20", label: "65-80" },
  { color: "#bd0026", label: "80+" },
];

/**
 * The map's key, one per layer. Below md it also prints the layer's caption: on a
 * phone the tab's `title` tooltip never shows, so this is the only place the
 * layer is explained.
 */
export default function MapLegend({ layer }: { layer: LayerId }) {
  return (
    <Card className="absolute bottom-6 left-2 z-map-chrome max-w-[240px] gap-0 bg-background/95 p-3 text-xs backdrop-blur-sm">
      {layer === "hvi" && (
        <>
          <p className="mb-1.5 font-semibold text-foreground">Heat Vulnerability Index (0-100)</p>
          <div className="flex overflow-hidden rounded-sm" aria-hidden="true">
            {HVI_LEGEND_BINS.map((b) => (
              <div key={b.color} className="h-3 flex-1" style={{ background: b.color }} />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground max-md:text-xs">
            <span>Less vulnerable</span>
            <span>Most vulnerable</span>
          </div>
        </>
      )}
      {layer === "hvi_grid" && (
        <>
          <p className="mb-1.5 font-semibold text-foreground">HVI, 1 km grid (0-100)</p>
          <div className="flex overflow-hidden rounded-sm" aria-hidden="true">
            {HVI_LEGEND_BINS.map((b) => (
              <div key={b.color} className="h-3 flex-1" style={{ background: b.color }} />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground max-md:text-xs">
            <span>Less vulnerable</span>
            <span>Most vulnerable</span>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground max-md:hidden">
            541 cells, the same score a ward is averaged from.
          </p>
        </>
      )}
      {layer === "plantability" && (
        <>
          <p className="mb-1.5 font-semibold text-foreground">Can trees go here?</p>
          <div className="space-y-1 text-foreground">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ background: "#4ade80" }} aria-hidden="true" />
              <span>Yes, suitable for planting</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ background: "#f87171" }} aria-hidden="true" />
              <span>No, cool roofs instead</span>
            </div>
          </div>
        </>
      )}
      {layer === "ndvi_change" && (
        <>
          <p className="mb-1.5 font-semibold text-foreground">Green cover since 2016-17</p>
          <div className="space-y-1 text-foreground">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ background: "#4ade80" }} aria-hidden="true" />
              <span>Gained vegetation</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm border border-border" style={{ background: "#d4d4d8" }} aria-hidden="true" />
              <span>Stable</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ background: "#f87171" }} aria-hidden="true" />
              <span>Lost vegetation</span>
            </div>
          </div>
        </>
      )}
      <p className="mt-1.5 text-xs leading-snug text-muted-foreground md:hidden">
        {LAYER_META[layer].caption}
      </p>
    </Card>
  );
}
