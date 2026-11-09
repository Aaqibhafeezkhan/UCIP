import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WardPanel from "./WardPanel";

vi.mock("@/lib/useWardData", () => ({
  useWardData: () => ({
    wards: ["A", "P/S"].map((ward_id, i) => ({
      type: "Feature",
      geometry: null,
      properties: { ward_id, HVI: 60 - i, rank: i + 1 },
    })),
    recs: [],
    profiles: null,
    intervals: new Map(),
    error: null,
  }),
}));

describe("WardPanel", () => {
  it("prints each ward's areas in its row, since a touch screen has no title tooltip", () => {
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    render(<WardPanel selectedWardId={null} onSelectWard={() => {}} />);
    expect(screen.getByText("Colaba, Fort, Churchgate, Marine Drive, Cuffe Parade")).toBeInTheDocument();
    expect(screen.getByText("Goregaon")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
