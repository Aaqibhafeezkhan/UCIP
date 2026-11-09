import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react";
import WardDialog from "./WardDialog";

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

/**
 * jsdom loads no CSS, so Radix's Presence sees no exit animation and unmounts
 * the content the moment the dialog closes. Give the content an animation name
 * while it is closing, as the real stylesheet does, so the sheet stays mounted
 * until its animationend, which is the window the last-ward retention is for.
 */
function stubExitAnimation() {
  const real = window.getComputedStyle.bind(window);
  vi.spyOn(window, "getComputedStyle").mockImplementation((element, pseudo) => {
    const style = real(element, pseudo ?? undefined);
    if (!(element instanceof HTMLElement) || element.dataset.slot !== "dialog-content") return style;
    return new Proxy(style, {
      get(target, prop) {
        if (prop === "animationName") return element.dataset.state === "closed" ? "exit" : "enter";
        const value = Reflect.get(target, prop, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  });
  // Presence escapes the animation name with CSS.escape, which jsdom lacks.
  vi.stubGlobal("CSS", { escape: (value: string) => value });
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/v1/wards")) return json(wardsFixture);
      if (url.includes("recommendations")) return json({ recommendations: [] });
      return { ok: false, json: async () => null } as unknown as Response;
    })
  );
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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ward dialog", () => {
  it("keeps showing the last ward while it closes instead of falling back to loading", async () => {
    stubExitAnimation();
    const props = { onSelectWard: () => {}, enabled: true };
    const { rerender } = render(<WardDialog selectedWardId="C" {...props} />);
    await screen.findByText("Priority 1 of 2", { exact: false });

    // What the URL does the moment the sheet starts closing.
    rerender(<WardDialog selectedWardId={null} {...props} />);

    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).toHaveAttribute("data-state", "closed");
    expect(screen.queryByText("Loading ward…")).toBeNull();
    expect(screen.getByText("Priority 1 of 2", { exact: false })).toBeInTheDocument();

    // The sheet goes once its exit animation ends. jsdom has no AnimationEvent,
    // so the animation name goes on a plain event.
    const ended = createEvent("animationend", dialog);
    Object.defineProperty(ended, "animationName", { value: "exit" });
    fireEvent(dialog, ended);
    await waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).toBeNull());
  });

  it("follows the selection to a neighbouring ward", async () => {
    const props = { onSelectWard: () => {}, enabled: true };
    const { rerender } = render(<WardDialog selectedWardId="C" {...props} />);
    await screen.findByText("Priority 1 of 2", { exact: false });

    rerender(<WardDialog selectedWardId="L" {...props} />);

    await screen.findByText("Priority 2 of 2", { exact: false });
    expect(screen.queryByText("Priority 1 of 2", { exact: false })).toBeNull();
  });

  it("stays closed while the sidebar shows the ward", () => {
    render(<WardDialog selectedWardId="C" onSelectWard={() => {}} enabled={false} />);

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
