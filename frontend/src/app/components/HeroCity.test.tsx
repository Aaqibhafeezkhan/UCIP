import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";

const sceneProps: Array<{ paused?: boolean }> = [];

// The real scene is a dynamic import of three.js, which jsdom cannot run. This
// stands in for it and records what HeroCity tells it.
vi.mock("next/dynamic", () => ({
  default: () => (props: { paused?: boolean }) => {
    sceneProps.push(props);
    return <div data-testid="scene" />;
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));

const hero = { wards: [], extent: { width: 1, height: 1 } };

let setInView: (isIntersecting: boolean) => void;

function stubBrowser({ saveData }: { saveData?: boolean }) {
  // The coastline is optional, so it can simply be missing.
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.includes("region") ? { ok: false } : { ok: true, json: async () => hero }
    )
  );
  // A canvas that has WebGL, and a 2d context that can answer the colour probe.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((type: string) =>
    type === "2d" ? { fillRect() {}, getImageData: () => ({ data: [0, 0, 0, 255] }) } : {}) as never);
  vi.stubGlobal("navigator", Object.assign(Object.create(window.navigator), { connection: { saveData } }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
        setInView = (isIntersecting) => act(() => callback([{ isIntersecting }]));
      }
      observe() {}
      disconnect() {}
    }
  );
}

/** HeroCity decides its renderer once per page load in module state, so each
 *  test loads a fresh copy of it, as a fresh page would. */
async function renderHero() {
  vi.resetModules();
  const { default: HeroCity } = await import("./HeroCity");
  return render(<HeroCity />);
}

beforeEach(() => {
  sceneProps.length = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: () => void) => window.setTimeout(cb, 0));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("HeroCity renderer choice", () => {
  it("renders the 3D scene by default", async () => {
    stubBrowser({});
    await renderHero();
    expect(await screen.findByTestId("scene")).toBeInTheDocument();
  });

  it("renders the flat SVG for a visitor who turned on Save-Data", async () => {
    stubBrowser({ saveData: true });
    const { container } = await renderHero();
    await waitFor(() => expect(container.querySelector("svg")).not.toBeNull());
    expect(screen.queryByTestId("scene")).toBeNull();
  });

  it("does not swap to the flat SVG when Save-Data is switched on mid-session", async () => {
    stubBrowser({ saveData: false });
    const { rerender, container } = await renderHero();
    expect(await screen.findByTestId("scene")).toBeInTheDocument();

    (navigator as unknown as { connection: { saveData: boolean } }).connection.saveData = true;
    const { default: HeroCity } = await import("./HeroCity");
    rerender(<HeroCity />);
    expect(screen.getByTestId("scene")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
  });
});

describe("HeroCity pause", () => {
  it("tells the scene to stop while the hero is off screen and to resume on return", async () => {
    stubBrowser({});
    await renderHero();
    await screen.findByTestId("scene");
    expect(sceneProps.at(-1)?.paused).toBe(false);

    setInView(false);
    expect(sceneProps.at(-1)?.paused).toBe(true);
    expect(screen.getByTestId("scene").parentElement).toHaveStyle({ visibility: "hidden" });

    setInView(true);
    expect(sceneProps.at(-1)?.paused).toBe(false);
    expect(screen.getByTestId("scene").parentElement).toHaveStyle({ visibility: "visible" });
  });
});
