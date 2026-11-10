import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MobileNavProvider } from "./MobileNav";
import SiteHeader from "./SiteHeader";
import { NAV_ROUTES } from "@/lib/routes";

const route = vi.hoisted(() => ({ pathname: "/dashboard" }));

vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
}));

/** What the Link stub navigated to. */
const navigated = vi.hoisted(() => ({ calls: [] as Array<{ href: string; replace: boolean }> }));

// next/link does nothing without a router, so jsdom would try a real navigation.
// This stub behaves like Link where it matters here: a click whose handler
// prevented default navigates nowhere, otherwise it pushes or, with `replace`,
// replaces the current history entry.
vi.mock("next/link", () => ({
  default: ({
    href,
    replace,
    onClick,
    children,
    ...rest
  }: React.ComponentProps<"a"> & { href: string; replace?: boolean }) => (
    <a
      {...rest}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        navigated.calls.push({ href, replace: Boolean(replace) });
        if (replace) window.history.replaceState(null, "", href);
        else window.history.pushState(null, "", href);
      }}
    >
      {children}
    </a>
  ),
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
  navigated.calls = [];
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
    window.history.replaceState(null, "", "/");
    render(<Page />);
    const { drawer } = await openMenu();

    const logo = within(drawer).getByRole("link", { name: "UCIP home" });
    expect(logo).toHaveAttribute("href", "/");
    expect(drawer.querySelector("a")).toBe(logo);
    // Not part of the page list, so it never claims aria-current.
    expect(logo).not.toHaveAttribute("aria-current");

    fireEvent.click(logo);

    await expectClosed();
    // The page you are on: closes without navigating.
    expect(navigated.calls).toEqual([]);
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

  it("closes without navigating when the current page's own link is tapped", async () => {
    // The dashboard's URL carries map state while its link is the bare path.
    // Navigating to the bare path would drop the ward, layer and map position.
    window.history.replaceState(null, "", "/dashboard?lat=1&lng=2");
    const back = vi.spyOn(window.history, "back");
    render(<Page />);
    const { drawer } = await openMenu();

    fireEvent.click(within(drawer).getByRole("link", { name: "Dashboard" }));

    await expectClosed();
    expect(navigated.calls).toEqual([]);
    // The drawer's own entry is popped, nothing else.
    expect(back).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(window.history.state?.ucipMobileNav).toBeUndefined());
    expect(window.location.pathname + window.location.search).toBe("/dashboard?lat=1&lng=2");
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

  it("leaves no extra Back step when a link to another page closes it", async () => {
    window.history.replaceState(null, "", "/dashboard?ward=C");
    const back = vi.spyOn(window.history, "back");
    render(<Page />);
    const { drawer } = await openMenu();
    const entries = window.history.length;

    fireEvent.click(within(drawer).getByRole("link", { name: "Methodology" }));

    await expectClosed();
    // The link replaced the drawer's entry. A push would have added one more
    // entry on top of it, and the menu would leave a dead Back step behind.
    expect(navigated.calls).toEqual([{ href: "/methodology", replace: true }]);
    expect(window.history.length).toBe(entries);
    expect(window.history.state).toBeNull();
    expect(window.location.pathname).toBe("/methodology");
    expect(back).not.toHaveBeenCalled();
  });

  describe("takes its one history entry off once, however it closes", () => {
    const closers: Array<[string, (drawer: HTMLElement) => void | Promise<void>]> = [
      ["Escape", (drawer) => void fireEvent.keyDown(drawer, { key: "Escape" })],
      [
        "the dimmed page",
        async () => {
          // Radix arms its outside-press listener a tick after it mounts.
          await act(() => new Promise((resolve) => setTimeout(resolve, 10)));
          const scrim = document.querySelector('[data-slot="dialog-overlay"]');
          expect(scrim).not.toBeNull();
          // Radix dismisses on the click that ends a press outside the panel.
          fireEvent.pointerDown(scrim!, { button: 0, pointerType: "mouse" });
          fireEvent.pointerUp(scrim!, { button: 0, pointerType: "mouse" });
          fireEvent.click(scrim!, { button: 0 });
        },
      ],
      ["the viewport reaching md", () => void media.reachMd()],
    ];

    it.each(closers)("%s", async (_name, close) => {
      window.history.replaceState(null, "", "/dashboard?ward=C");
      const back = vi.spyOn(window.history, "back");
      render(<Page />);
      const { drawer } = await openMenu();
      expect(window.history.state?.ucipMobileNav).toBe(true);

      await close(drawer);

      await expectClosed();
      expect(back).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(window.history.state?.ucipMobileNav).toBeUndefined());
      expect(window.location.search).toBe("?ward=C");
    });
  });

  it("pushes one entry for two taps on the menu button", async () => {
    window.history.replaceState(null, "", "/dashboard");
    const push = vi.spyOn(window.history, "pushState");
    const back = vi.spyOn(window.history, "back");
    render(<Page />);
    const hamburger = screen.getByRole("button", { name: "Open menu" });

    fireEvent.click(hamburger);
    fireEvent.click(hamburger);
    const drawer = await screen.findByRole("dialog", { name: "Menu" });

    expect(push).toHaveBeenCalledTimes(1);
    fireEvent.click(within(drawer).getByRole("button", { name: "Close menu" }));
    await expectClosed();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("still closes on Back after the page rewrote its own URL under the open menu", async () => {
    window.history.replaceState(null, "", "/dashboard?ward=C");
    render(<Page />);
    await openMenu();

    // The dashboard calls replaceState for ward and map changes, which also
    // overwrites the drawer's marker. Back must not depend on the marker.
    window.history.replaceState(null, "", "/dashboard?ward=C&lat=19&lng=72.8");
    expect(window.history.state?.ucipMobileNav).toBeUndefined();
    act(() => window.history.back());

    await expectClosed();
    expect(window.location.pathname).toBe("/dashboard");
  });

  it("pushes a fresh entry when it opens again after a navigation it did not make", async () => {
    window.history.replaceState(null, "", "/dashboard");
    const push = vi.spyOn(window.history, "pushState");
    const back = vi.spyOn(window.history, "back");
    const { rerender } = render(<Page />);
    await openMenu();
    expect(push).toHaveBeenCalledTimes(1);

    // Something else navigates (not a drawer link): the entry is no longer current.
    route.pathname = "/methodology";
    rerender(<Page />);
    await expectClosed();

    const { drawer } = await openMenu();
    expect(push).toHaveBeenCalledTimes(2);
    fireEvent.click(within(drawer).getByRole("button", { name: "Close menu" }));
    await expectClosed();
    // Its X pops the entry this open pushed, not the one a page leaves behind.
    expect(back).toHaveBeenCalledTimes(1);
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
