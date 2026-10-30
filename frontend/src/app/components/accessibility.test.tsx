/**
 * Automated accessibility checks (issue #223).
 *
 * The 2026-09-24 review (#118) found its failures, including four layer tabs
 * pointing at panels that did not exist, by running axe in a browser console.
 * This repeats the structural part of that on every build: ARIA references,
 * names and roles, which are cheap to catch here and expensive to rediscover
 * by hand.
 *
 * `color-contrast` is switched off because jsdom cannot compute layout or
 * resolved colours, so it would report nothing useful either way. See
 * docs/accessibility-audit.md for what these checks do not cover.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import LayerSwitcher from "./LayerSwitcher";
import WardDialog from "./WardDialog";
import WardListSheet from "./WardListSheet";
import { areasForWard } from "@/lib/wardAreas";

async function violations(container: Element = document.body) {
  const results = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    rules: { "color-contrast": { enabled: false } },
  });
  return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target).join(", ")})`);
}

const square = {
  type: "Polygon",
  coordinates: [[[72.8, 19], [72.9, 19], [72.9, 19.1], [72.8, 19.1], [72.8, 19]]],
};

const wardsFixture = {
  source: "snapshot",
  count: 2,
  wards: [
    { ward_id: "C", hvi: 82.6, rank: 1, n_cells: 4, contrib: { LST_C: 0.2, NDVI: 0.1 }, geom_geojson: square },
    { ward_id: "L", hvi: 61.0, rank: 2, n_cells: 9, contrib: { LST_C: 0.1, NDVI: 0.2 }, geom_geojson: square },
  ],
};

const json = (body: unknown) => ({ ok: true, json: async () => body }) as unknown as Response;

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/v1/wards")) return json(wardsFixture);
      if (url.includes("recommendations")) return json({ recommendations: [] });
      if (url.includes("hvi_uncertainty")) {
        return json({
          per_ward: [
            { ward_id: "C", rank_ci_low: 1, rank_ci_high: 2 },
            { ward_id: "L", rank_ci_low: 1, rank_ci_high: 5 },
          ],
        });
      }
      return { ok: false, json: async () => null } as unknown as Response;
    })
  );
  // jsdom has no layout engine; Radix and the ward static map read these.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("accessibility (axe, WCAG 2.1 A and AA, no colour contrast)", () => {
  it("layer switcher has no violations and every tab's aria-controls resolves", async () => {
    const { container } = render(<LayerSwitcher activeLayer="hvi" />);
    expect(await violations(container)).toEqual([]);
    for (const tab of screen.getAllByRole("tab")) {
      const panelId = tab.getAttribute("aria-controls");
      expect(panelId, `${tab.textContent} should name a panel`).toBeTruthy();
      expect(document.getElementById(panelId!), `panel ${panelId} should exist`).not.toBeNull();
    }
  });

  it("ward dialog has no violations once a ward is open", async () => {
    render(<WardDialog selectedWardId="C" onSelectWard={() => {}} enabled />);
    await screen.findByText("Priority 1 of 2", { exact: false });
    expect(await violations()).toEqual([]);
  });

  it("mobile ward list sheet has no violations, filters by search and hands off the choice", async () => {
    const onSelectWard = vi.fn();
    render(<WardListSheet onSelectWard={onSelectWard} />);

    const button = screen.getByRole("button", { name: /wards/i });
    fireEvent.click(button);
    const search = await screen.findByPlaceholderText("Find a ward or area…");
    await screen.findByText("Ward C");
    expect(await violations()).toEqual([]);

    // An area only ward L covers, so the filter has something to exclude.
    const onlyL = areasForWard("L").find(
      (area) => !areasForWard("C").some((c) => c.toLowerCase().includes(area.toLowerCase()))
    )!;
    fireEvent.change(search, { target: { value: onlyL } });
    await waitFor(() => expect(screen.queryByText("Ward C")).toBeNull());
    expect(screen.getByText("Ward L")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Ward L"));
    expect(onSelectWard).toHaveBeenCalledWith("L");
    await waitFor(() => expect(screen.queryByPlaceholderText("Find a ward or area…")).toBeNull());
  });
});
