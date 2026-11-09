import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { ROUTES } from "./routes";

describe("route registry", () => {
  it("lists each path once, rooted at a slash", () => {
    const paths = ROUTES.map(({ path }) => path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) expect(path.startsWith("/")).toBe(true);
  });

  // lighthouserc.json is plain JSON and cannot import the registry, so this is
  // what stops the two lists drifting apart.
  it("flags for Lighthouse exactly the registry routes that lighthouserc.json audits", () => {
    const config = JSON.parse(
      readFileSync(join(process.cwd(), "..", "lighthouserc.json"), "utf8")
    ) as { ci: { collect: { url: string[] } } };
    const audited = config.ci.collect.url.map((u) => new URL(u).pathname);
    const known = new Set(ROUTES.map(({ path }) => path));

    // Dynamic pages such as /embed/ward/C are audited too but are not registry routes.
    const auditedRoutes = audited.filter((path) => known.has(path));
    const flagged = ROUTES.filter(({ lighthouse }) => lighthouse).map(({ path }) => path);
    expect(flagged.sort()).toEqual(auditedRoutes.sort());
  });
});
