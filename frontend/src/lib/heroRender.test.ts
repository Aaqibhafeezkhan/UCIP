import { describe, it, expect } from "vitest";
import { prefersFlatHero } from "./heroRender";

describe("prefersFlatHero", () => {
  it("is false when the browser reports nothing", () => {
    expect(prefersFlatHero(undefined)).toBe(false);
    expect(prefersFlatHero({})).toBe(false);
  });

  it("is true when the visitor asked to save data", () => {
    expect(prefersFlatHero({ saveData: true })).toBe(true);
  });

  it("is false when Save-Data is off", () => {
    expect(prefersFlatHero({ saveData: false })).toBe(false);
  });

  it("ignores the connection type, which misreports and is missing on iOS", () => {
    for (const effectiveType of ["slow-2g", "2g", "3g", "4g"]) {
      expect(prefersFlatHero({ effectiveType } as never)).toBe(false);
    }
  });
});
