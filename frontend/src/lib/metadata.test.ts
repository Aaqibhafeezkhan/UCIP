import { afterEach, describe, expect, it, vi } from "vitest";
import { pageMetadata, shareCard, SHARE_IMAGE, SITE_DESCRIPTION, SITE_TITLE } from "./metadata";
import { SITE_URL } from "./wardShare";

const INPUT = { title: "Methodology | UCIP", description: "How the index is built", path: "/methodology" };

function canonicalOf(meta: ReturnType<typeof pageMetadata>): string {
  return meta.alternates?.canonical as string;
}

describe("pageMetadata", () => {
  it("keeps the page's own title and description", () => {
    const meta = pageMetadata(INPUT);
    expect(meta.title).toBe(INPUT.title);
    expect(meta.description).toBe(INPUT.description);
    expect(meta.openGraph?.title).toBe(INPUT.title);
    expect(meta.openGraph?.description).toBe(INPUT.description);
  });

  it("gives an absolute canonical that the og:url repeats exactly", () => {
    const meta = pageMetadata(INPUT);
    const canonical = canonicalOf(meta);
    expect(canonical).toBe(`${SITE_URL}/methodology`);
    expect(new URL(canonical).origin).toBe(new URL(SITE_URL).origin);
    expect((meta.openGraph as { url?: string }).url).toBe(canonical);
  });

  it("handles the home path without a double slash", () => {
    const canonical = canonicalOf(pageMetadata({ ...INPUT, path: "/" }));
    expect(canonical).toBe(`${SITE_URL}/`);
    expect(canonical.replace("://", "")).not.toContain("//");
  });

  it("accepts a path with no leading slash", () => {
    expect(canonicalOf(pageMetadata({ ...INPUT, path: "cities" }))).toBe(`${SITE_URL}/cities`);
  });

  it("always carries the share image with its size, type and alt text", () => {
    const meta = pageMetadata(INPUT);
    const images = (meta.openGraph as { images?: Array<typeof SHARE_IMAGE> }).images;
    expect(images).toHaveLength(1);
    expect(images?.[0]).toMatchObject({
      url: "/og-image.png",
      width: 1200,
      height: 630,
      type: "image/png",
    });
    expect(images?.[0].alt.length).toBeGreaterThan(10);
  });

  it("mirrors the Open Graph card on Twitter as a large summary", () => {
    const meta = pageMetadata(INPUT);
    const og = meta.openGraph as { title: string; description: string; images: Array<typeof SHARE_IMAGE> };
    const twitter = meta.twitter as {
      card: string;
      title: string;
      description: string;
      images: Array<{ url: string; alt: string }>;
    };
    expect(twitter.card).toBe("summary_large_image");
    expect(twitter.title).toBe(og.title);
    expect(twitter.description).toBe(og.description);
    expect(twitter.images).toEqual([{ url: og.images[0].url, alt: og.images[0].alt }]);
  });

  it("names the site and marks the page as a website", () => {
    expect(pageMetadata(INPUT).openGraph).toMatchObject({ siteName: "UCIP", type: "website" });
  });
});

describe("shareCard", () => {
  it("carries the image and the given url but sets no canonical, so the layout can use it", () => {
    const card = shareCard({ title: SITE_TITLE, description: SITE_DESCRIPTION, url: SITE_URL });
    expect(card).not.toHaveProperty("alternates");
    expect(card.openGraph).toMatchObject({ url: SITE_URL, images: [SHARE_IMAGE] });
  });
});

describe("SITE_URL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("drops a trailing slash from the environment value, so paths never double it", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://preview.example.com/");
    vi.resetModules();
    const { pageMetadata: fresh } = await import("./metadata");
    expect(fresh({ ...INPUT, path: "/" }).alternates?.canonical).toBe("https://preview.example.com/");
    expect(fresh(INPUT).alternates?.canonical).toBe("https://preview.example.com/methodology");
  });
});
