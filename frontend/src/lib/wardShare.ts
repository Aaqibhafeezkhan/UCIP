/**
 * Where a ward's own page lives, for the canonical tag, the sitemap and the
 * share actions. One formula, so the sitemap URL and the canonical URL cannot
 * drift apart.
 */

import { ACTIVE_CITY } from "./city";
import { wardSlug } from "./wardSlug";

// The one site-URL constant: the layout's metadataBase, the sitemap, every
// canonical and og:url read it. Production domain, confirmed live 2026-09-03.
// Defaulting to it rather than localhost so canonical URLs, OG images and the
// sitemap are correct on a deploy with no env vars set; NEXT_PUBLIC_SITE_URL
// still overrides for previews and local work. A trailing slash is dropped so
// `${SITE_URL}/path` never doubles it.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://uciplatform.vercel.app").replace(
  /\/+$/,
  ""
);

export function wardPageUrl(wardId: string): string {
  return `${SITE_URL}/ward/${wardSlug(wardId)}`;
}

/** One line for a share message or the native share sheet. */
export function wardShareText(wardId: string, rank: number | null, totalWards: number): string {
  const place = rank === null ? "" : `, priority ${rank} of ${totalWards}`;
  return `Heat vulnerability in ${ACTIVE_CITY.name} ward ${wardId}${place} (UCIP)`;
}

export function whatsappHref(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}
