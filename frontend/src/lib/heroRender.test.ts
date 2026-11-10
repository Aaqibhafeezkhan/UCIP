import { describe, it, expect } from "vitest";
import { canvasSettings, prefersFlatHero } from "./heroRender";

describe("prefersFlatHero", () => {
  it("is false when the browser reports nothing", () => {
    expect(prefersFlatHero(undefined)).toBe(false);
    expect(prefersFlatHero({})).toBe(false);
  });

  it("is true when the visitor asked to save data", () => {
    expect(prefersFlatHero({ saveData: true, effectiveType: "4g" })).toBe(true);
  });

  it("is true on 3g and slower, false on 4g", () => {
    for (const type of ["slow-2g", "2g", "3g"]) expect(prefersFlatHero({ effectiveType: type })).toBe(true);
    expect(prefersFlatHero({ effectiveType: "4g" })).toBe(false);
  });
});

describe("canvasSettings", () => {
  it("keeps the desktop canvas as it was", () => {
    expect(canvasSettings(false)).toEqual({ dpr: [1, 1.75], antialias: true });
  });

  it("renders a touch-only device at 1x without multisampling", () => {
    expect(canvasSettings(true)).toEqual({ dpr: [1, 1], antialias: false });
  });
});
