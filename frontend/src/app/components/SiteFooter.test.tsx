import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SiteFooter from "./SiteFooter";
import { FOOTER_ROUTES } from "@/lib/routes";

const hrefs = (container: HTMLElement) =>
  new Set(Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href")));

describe("SiteFooter", () => {
  it("links every footer route, every legal section and the contact points", () => {
    const { container } = render(<SiteFooter />);
    const found = hrefs(container);
    for (const route of FOOTER_ROUTES) expect(found).toContain(route.path);
    for (const section of ["license", "data-sources", "disclaimers", "privacy"]) {
      expect(found).toContain(`/legal#${section}`);
    }
    expect(found).toContain("/contact");
    expect(found).toContain("mailto:dhawansanay@gmail.com");
    expect(found).toContain("https://github.com/AnayDhawan/ucip");
  });

  it("offers the data credits as a link, for the phone layout that drops the paragraph", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "Data sources and credits" })).toHaveAttribute(
      "href",
      "/legal#data-sources"
    );
  });
});
