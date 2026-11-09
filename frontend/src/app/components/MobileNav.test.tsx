import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

beforeEach(() => {
  route.pathname = "/dashboard";
  media = stubMatchMedia();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mobile nav drawer", () => {
  it("opens with every page linked and the current one marked", async () => {
    render(<Page />);
    const { hamburger, drawer } = await openMenu();

    const links = within(drawer).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(NAV_ROUTES.map((r) => r.label));
    expect(within(drawer).getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(links.filter((link) => link.hasAttribute("aria-current"))).toHaveLength(1);
    expect(hamburger).toHaveAttribute("aria-expanded", "true");
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

  it("leaves the header's hamburger harmless without a provider", () => {
    render(<SiteHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
