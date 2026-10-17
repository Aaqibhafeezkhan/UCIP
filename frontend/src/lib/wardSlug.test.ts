import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { wardIdFromSlug, wardSlug } from "./wardSlug";

const wardIds: string[] = JSON.parse(
  readFileSync(join(process.cwd(), "public", "wards_hvi.geojson"), "utf8")
).features.map((f: { properties: { ward_id: string } }) => f.properties.ward_id);

describe("wardSlug", () => {
  it("never contains a slash, for every published ward", () => {
    for (const id of wardIds) expect(wardSlug(id)).not.toContain("/");
  });

  it("round-trips every published ward", () => {
    for (const id of wardIds) expect(wardIdFromSlug(wardSlug(id))).toBe(id);
  });

  it("leaves single-letter codes unchanged, so old links still resolve", () => {
    expect(wardSlug("C")).toBe("C");
    expect(wardSlug("F/N")).toBe("F-N");
  });
});

describe("wardIdFromSlug", () => {
  it("accepts slug, raw and percent-encoded forms in any case", () => {
    expect(wardIdFromSlug("f-n")).toBe("F/N");
    expect(wardIdFromSlug("F/N")).toBe("F/N");
    expect(wardIdFromSlug("F%2FN")).toBe("F/N");
  });

  it("returns null for malformed percent-encoding instead of throwing", () => {
    expect(wardIdFromSlug("%E0%A4%A")).toBeNull();
  });
});
