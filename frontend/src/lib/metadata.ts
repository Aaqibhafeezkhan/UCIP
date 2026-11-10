/**
 * Page metadata in one place, so every route gets its own canonical URL,
 * `og:url` and a share card with dimensions and alt text.
 *
 * Why a helper: Next replaces a layout's `openGraph` and `twitter` objects
 * wholesale when a page sets its own, so a page that only wrote a title would
 * lose the layout's image. `pageMetadata` always writes the whole set.
 */

import type { Metadata } from "next";
import { SITE_URL } from "./wardShare";

export const SITE_NAME = "UCIP";
export const SITE_TITLE = "UCIP: Urban Climate Intelligence Platform";
export const SITE_DESCRIPTION = "Ward-level heat vulnerability for Mumbai, built from free open data.";

/** The generic share card. Ward pages use their own file-based image instead. */
export const SHARE_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "UCIP: Mumbai ward-level heat vulnerability decision-support platform",
  type: "image/png",
};

/** Absolute URL of a site path. A leading slash is added when missing. */
export function pageUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** The Open Graph and Twitter cards for a page at `url`, image included. */
export function shareCard({
  title,
  description,
  url,
}: {
  title: string;
  description: string;
  url: string;
}): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      images: [SHARE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: SHARE_IMAGE.url, alt: SHARE_IMAGE.alt }],
    },
  };
}

/**
 * Title, description, canonical and share cards for the page at `path`.
 * Use it for every route except the ward pages, which keep their file-based
 * share image, and the embed routes.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = pageUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    ...shareCard({ title, description, url }),
  };
}
