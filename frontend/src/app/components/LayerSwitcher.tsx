"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MapLayer } from "@/lib/mapState";

type LayerId = MapLayer;

export const LAYER_META: Record<LayerId, { label: string; url: string; caption: string }> = {
  hvi: {
    label: "Heat vulnerability",
    url: "/wards_hvi.geojson",
    caption: "How urgently each ward needs cooling, combining heat, people, and access to help.",
  },
  hvi_grid: {
    label: "Heat grid",
    // Same file the plantability layer reads: cells_nbs.geojson already
    // carries HVI per cell, alongside plantable/worldcover_class.
    url: "/cells_nbs.geojson",
    caption: "The same index at the 1 km cell it's measured at, before 541 cells are averaged into 24 wards.",
  },
  plantability: {
    label: "Plantability",
    url: "/cells_nbs.geojson",
    caption: "Where planting trees makes ecological sense, and where cool roofs work better.",
  },
  ndvi_change: {
    label: "Green-cover change",
    url: "/cells_ndvi_change.geojson",
    caption: "Where vegetation has grown or been lost since the 2016-17 dry season.",
  },
};

/**
 * The map's layer tabs, with the panels each trigger's `aria-controls` names.
 *
 * Its own component so the accessibility test (issue #223) can render exactly
 * this markup without a Leaflet map behind it.
 */
export default function LayerSwitcher({
  activeLayer,
  onLayerChange,
}: {
  activeLayer: LayerId;
  onLayerChange?: (layer: LayerId) => void;
}) {
  return (
    <Tabs value={activeLayer} onValueChange={(v: string) => onLayerChange?.(v as LayerId)}>
      {/* Height is overridden through the same group-data variant the
          primitive uses, so it wins rather than sitting alongside it. */}
      <TabsList aria-label="Map layer" className="group-data-horizontal/tabs:h-7">
        {(Object.keys(LAYER_META) as LayerId[]).map((id) => (
          <TabsTrigger
            key={id}
            value={id}
            title={LAYER_META[id].caption}
            className="whitespace-nowrap px-1.5 text-xs"
          >
            {LAYER_META[id].label}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Each trigger's aria-controls points at one of these. Without
          them Radix emits a reference to an id that is not in the
          document, which is a critical WCAG failure (issue #118): axe
          reports aria-valid-attr-value on every tab.

          They are not a formality. The thing these tabs actually
          control is a Leaflet canvas, which conveys nothing to a screen
          reader, so the panel is the only place the current layer gets
          described in words. Visually hidden because the map is the
          sighted user's version of the same information. */}
      {(Object.keys(LAYER_META) as LayerId[]).map((id) => (
        <TabsContent key={id} value={id} className="sr-only">
          {LAYER_META[id].caption}
        </TabsContent>
      ))}
    </Tabs>
  );
}
