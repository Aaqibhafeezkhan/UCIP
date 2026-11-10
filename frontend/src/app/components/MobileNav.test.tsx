import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MobileNavProvider } from "./MobileNav";
import SiteHeader from "./SiteHeader";
import { NAV_ROUTES } from "@/lib/routes";

const route = vi.hoisted(() => ({ pathname: "/dashboard" }));

vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
}));

/** jsdom has no matchMedia. This one records its listeners so a test can cross md. */
function stubMatchMedia() {
  const listeners = new Set<(event: { matches: boolean }) => void>();
  const matchMedia = vi.fn((query: string) => ({
    media: query,
    matches: false,
    addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) =>
      listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: { matches: boolean }) => void) =>
      listeners.delete(listener),
  }));
  vi.stubGlobal("matchMedia", matchMedia);
  return {
    matchMedia,
    reachMd: () => act(() => listeners.forEach((listener) => listener({ matches: true }))),
  };
}

function Page() {
  return (
    <MobileNavProvider>
      <SiteHeader />
    </MobileNavProvider>
  );
}

async function openMenu() {
  const hamburger = screen.getByRole("button", { name: "Open menu" });
  fireEvent.click(hamburger);
  const drawer = await screen.findByRole("dialog", { name: "Menu" });
  return { hamburger, drawer };
}

async function expectClosed() {
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

let media: ReturnType<typeof stubMatchMedia>;

// The drawer loads on first use, and the first import in a cold test run
// (transforming the dialog and icon code) can outlast findBy's one second.
// Warm it once so the tests measure behavior, not the transform.
beforeAll(async () => {
  await import("./MobileNavDrawer");
}, 30000);

beforeEach(() => {
  route.pathname = "/dashboard";
  media = stubMatchMedia();
});

afterEach(async () => {
  // Unmount while the stubbed globals are still in place: a page that scheduled
  // an idle callback cancels it on unmount.
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  // A close can still have a history.back() in flight. Let it land, then put
  // the URL and state back, so one test's entries never leak into the next.
  await new Promise((resolve) => setTimeout(resolve, 0));
  window.history.replaceState(null, "", "/");
});

describe("mobile nav drawer", () => {
  it("opens with every page linked and the current one marked", async () => {
    render(<Page />);
    const { hamburger, drawer } = await openMenu();

    const links = within(within(drawer).getByRole("navigation", { name: "Main mobile" })).getAllByRole(
      "link"
    );
    expect(links.map((link) => link.textContent)).toEqual(NAV_ROUTES.map((r) => r.label));
    expect(within(drawer).getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(links.filter((link) => link.hasAttribute("aria-current"))).toHaveLength(1);
    expect(hamburger).toHaveAttribute("aria-expanded", "true");
  });

  it("links the logo home at the top and closes when it is tapped", async () => {
    // On the home page the tap changes no route, so only its own onClick can close.
    route.pathname = "/";
    render(<Page />);
    const { drawer } = await openMenu();

    const logo = within(drawer).getByRole("link", { name: "UCIP home" });
    expect(logo).toHaveAttribute("href", "/");
    expect(drawer.querySelector("a")).toBe(logo);
    // Not part of the page list, so it never claims aria-current.
    expect(logo).not.toHaveAttribute("aria-current");
    document.addEventListener("click", (event) => event.preventDefault(), { once: true });

    fireEvent.click(logo);

    await expectClosed();
  });

  it("labels the theme control in text", async () => {
    render(<Page />);
    const { drawer } = await openMenu();

    expect(within(drawer).getByText("Theme")).toBeVisible();
    expect(within(drawer).getByRole("radiogroup", { name: "Color theme" })).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    render(<Page />);
    const { drawer } = await openMenu();

    fireEvent.keyDown(drawer, { key: "Escape" });

    await expectClosed();
  });

  it("closes from its own close button", async () => {
    render(<Page />);
    const { drawer } = await openMenu();

    fireEvent.click(within(drawer).getByRole("button", { name: "Close menu" }));

    await expectClosed();
  });

  it("takes focus on open and gives it back to the opener on close", async () => {
    render(<Page />);
    const { hamburger, drawer } = await openMenu();
    await waitFor(() => expect(drawer).toContainElement(document.activeElement as HTMLElement));

    fireEvent.keyDown(drawer, { key: "Escape" });

    await waitFor(() => expect(hamburger).toHaveFocus());
    expect(hamburger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when the route changes", async () => {
    const { rerender } = render(<Page />);
    await openMenu();

    route.pathname = "/methodology";
    rerender(<Page />);

    await expectClosed();
  });

  it("closes when the current page's own link is tapped", async () => {
    render(<Page />);
    const { drawer } = await openMenu();
    // Next's Link does nothing without a router, so jsdom would try a real navigation.
    document.addEventListener("click", (event) => event.preventDefault(), { once: true });

    fireEvent.click(within(drawer).getByRole("link", { name: "Dashboard" }));

    await expectClosed();
  });

  it("closes when the viewport reaches md", async () => {
    render(<Page />);
    await openMenu();
    expect(media.matchMedia).toHaveBeenCalledWith("(min-width: 48rem)");

    media.reachMd();

    await expectClosed();
  });

  it("closes on Back and stays on the page", async () => {
    window.history.replaceState(null, "", "/dashboard?ward=C&layer=hvi");
    render(<Page />);
    await openMenu();
    expect(window.history.state?.ucipMobileNav).toBe(true);

    act(() => window.history.back());

    await expectClosed();
    expect(window.location.pathname).toBe("/dashboard");
    // The dashboard's ward and layer params survive the menu opening and closing.
    expect(window.location.search).toBe("?ward=C&layer=hvi");
    expect(window.history.state?.ucipMobileNav).toBeUndefined();
  });

  it("takes its history entry back off when it closes from its own button", async () => {
    window.history.replaceState(null, "", "/dashboard?ward=C");
    const back = vi.spyOn(window.history, "back");
    render(<Page />);
    const { drawer } = await openMenu();

    fireEvent.click(within(drawer).getByRole("button", { name: "Close menu" }));

    await expectClosed();
    expect(back).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(window.history.state?.ucipMobileNav).toBeUndefined());
    expect(window.location.search).toBe("?ward=C");
  });

  it("leaves no extra Back step when a link closes it", async () => {
    window.history.replaceState(null, "", "/dashboard");
    const back = vi.spyOn(window.history, "back");
    render(<Page />);
    const { drawer } = await openMenu();
    document.addEventListener("click", (event) => event.preventDefault(), { once: true });

    // Another page: the link replaces the drawer's entry, so nothing is popped.
    fireEvent.click(within(drawer).getByRole("link", { name: "Methodology" }));

    await expectClosed();
    expect(back).not.toHaveBeenCalled();
  });

  it("keeps the page alive and retries when the drawer's code fails to load", async () => {
    // A fresh copy of the modules whose drawer import fails once, as a chunk
    // does offline, then loads.
    vi.resetModules();
    let attempts = 0;
    vi.doMock("./MobileNavDrawer", async (importActual) => {
      attempts += 1;
      if (attempts === 1) throw new Error("Loading chunk failed");
      return importActual();
    });
    const { MobileNavProvider: Provider } = await import("./MobileNav");
    const { default: Header } = await import("./SiteHeader");
    window.history.replaceState(null, "", "/dashboard?ward=C");
    const back = vi.spyOn(window.history, "back");
    render(
      <Provider>
        <Header />
      </Provider>
    );
    const hamburger = screen.getByRole("button", { name: "Open menu" });

    fireEvent.click(hamburger);

    // No crash: the page and its menu button are still there, the menu stays
    // shut, and the entry the tap pushed is taken back off exactly once.
    await waitFor(() => expect(back).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(hamburger).toHaveAttribute("aria-expanded", "false"));
    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(window.history.state?.ucipMobileNav).toBeUndefined());
    expect(window.location.search).toBe("?ward=C");

    // The failure was not remembered: the next tap loads the drawer.
    fireEvent.click(hamburger);
    expect(await screen.findByRole("dialog", { name: "Menu" })).toBeInTheDocument();
    expect(attempts).toBe(2);
    expect(back).toHaveBeenCalledTimes(1);
    vi.doUnmock("./MobileNavDrawer");
  });

  describe("idle preload", () => {
    /** Fresh modules whose drawer import is counted, so a preload is visible
        without a tap. */
    async function freshPage() {
      vi.resetModules();
      const loads = { count: 0 };
      vi.doMock("./MobileNavDrawer", async (importActual) => {
        loads.count += 1;
        return importActual();
      });
      const { MobileNavProvider: Provider } = await import("./MobileNav");
      const { default: Header } = await import("./SiteHeader");
      render(
        <Provider>
          <Header />
        </Provider>
      );
      return loads;
    }

    afterEach(() => {
      vi.doUnmock("./MobileNavDrawer");
    });

    it("fetches the drawer when the browser is idle on a phone, without a tap", async () => {
      const idle: Array<() => void> = [];
      vi.stubGlobal("requestIdleCallback", (callback: () => void) => idle.push(callback));
      vi.stubGlobal("cancelIdleCallback", () => {});

      const loads = await freshPage();

      expect(idle).toHaveLength(1);
      expect(loads.count).toBe(0);
      act(() => idle[0]());
      await waitFor(() => expect(loads.count).toBe(1));
    });

    it("waits two seconds instead where there is no requestIdleCallback", async () => {
      const timers = vi.spyOn(window, "setTimeout");

      await freshPage();

      expect(timers).toHaveBeenCalledWith(expect.any(Function), 2000);
    });

    it("does not preload from md up, where there is no hamburger", async () => {
      const idle = vi.fn();
      vi.stubGlobal("requestIdleCallback", idle);
      vi.stubGlobal("cancelIdleCallback", () => {});
      vi.stubGlobal("matchMedia", (query: string) => ({
        media: query,
        matches: true,
        addEventListener: () => {},
        removeEventListener: () => {},
      }));

      const loads = await freshPage();

      expect(idle).not.toHaveBeenCalled();
      expect(loads.count).toBe(0);
    });
  });

  it("leaves the header's hamburger harmless without a provider", () => {
    render(<SiteHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
