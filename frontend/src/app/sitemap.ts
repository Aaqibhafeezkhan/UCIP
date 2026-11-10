import type { MetadataRoute } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROUTES } from "@/lib/routes";
import { SITE_URL, wardPageUrl } from "@/lib/wardShare";
import { wardFeatures } from "@/lib/wardSnapshot";

// When the data last changed, from the pipeline run log. Using the build time
// would stamp every page as modified on each deploy. Undefined when no run has
// been recorded, which omits lastModified rather than guessing one.
function lastRefresh(): Date | undefined {
  try {
    const log = JSON.parse(
      readFileSync(join(process.cwd(), "public", "pipeline_run_log.json"), "utf8")
    ) as { finished_at?: string };
    const finished = log.finished_at ? new Date(log.finished_at) : undefined;
    return finished && !Number.isNaN(finished.getTime()) ? finished : undefined;
  } catch {
    return undefined;
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const refreshed = lastRefresh();

  const pages = ROUTES.map(({ path, priority, dataPage }) => ({
    url: `${SITE_URL}${path}`,
    ...(dataPage && refreshed ? { lastModified: refreshed } : {}),
    priority,
  }));

  // The ward pages show scores from the same pipeline run as the dashboard.
  const wardPages = wardFeatures.map(({ properties }) => ({
    url: wardPageUrl(properties.ward_id),
    ...(refreshed ? { lastModified: refreshed } : {}),
    priority: 0.5,
  }));

  return [...pages, ...wardPages];
}
