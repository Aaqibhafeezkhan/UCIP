import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MapLegend from "./MapLegend";
import { LAYER_META } from "./LayerSwitcher";
import type { MapLayer } from "@/lib/mapState";

describe("MapLegend", () => {
  it.each(Object.keys(LAYER_META) as MapLayer[])(
    "prints the %s layer's caption, since a phone never shows the tab's tooltip",
    (layer) => {
      render(<MapLegend layer={layer} />);
      expect(screen.getByText(LAYER_META[layer].caption)).toBeInTheDocument();
    }
  );
});
