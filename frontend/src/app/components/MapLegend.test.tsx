import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MapLegend from "./MapLegend";
import { LAYER_META } from "./LayerSwitcher";
import type { MapLayer } from "@/lib/mapState";

const OTHER_LAYERS = (Object.keys(LAYER_META) as MapLayer[]).filter((l) => l !== "hvi");

describe("MapLegend", () => {
  it.each(OTHER_LAYERS)(
    "prints the %s layer's caption, since a phone never shows the tab's tooltip",
    (layer) => {
      render(<MapLegend layer={layer} />);
      expect(screen.getByText(LAYER_META[layer].caption)).toBeInTheDocument();
    }
  );

  it("leaves the default layer's caption out; its title and scale already explain it", () => {
    render(<MapLegend layer="hvi" />);
    expect(screen.queryByText(LAYER_META.hvi.caption)).not.toBeInTheDocument();
    expect(screen.getByText("Heat Vulnerability Index (0-100)")).toBeInTheDocument();
  });
});
