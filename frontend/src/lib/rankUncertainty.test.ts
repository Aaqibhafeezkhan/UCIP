import { describe, it, expect } from "vitest";
import {
  indexIntervals,
  intervalWidth,
  intervalsOverlap,
  ordinal,
  rankRangeLabel,
} from "./rankUncertainty";

describe("rankUncertainty", () => {
  it("indexes complete intervals and skips wards without one", () => {
    const map = indexIntervals({
      per_ward: [
        { ward_id: "B", rank_ci_low: 1, rank_ci_high: 20, hvi_ci_low: 50, hvi_ci_high: 70 },
        { ward_id: "X", rank_ci_low: null, rank_ci_high: 4 },
      ],
    });
    expect(map.get("B")).toEqual({ rank_ci_low: 1, rank_ci_high: 20, hvi_ci_low: 50, hvi_ci_high: 70 });
    expect(map.has("X")).toBe(false);
    expect(indexIntervals(null).size).toBe(0);
  });

  it("writes ordinals, including the teens", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual([
      "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd",
    ]);
  });

  it("labels a range and a single place", () => {
    expect(rankRangeLabel({ rank_ci_low: 1, rank_ci_high: 20 })).toBe("1st to 20th");
    expect(rankRangeLabel({ rank_ci_low: 3, rank_ci_high: 3 })).toBe("3rd");
  });

  it("measures width as high minus low, matching the file's own summary", () => {
    expect(intervalWidth({ rank_ci_low: 1, rank_ci_high: 20 })).toBe(19);
  });

  it("detects overlapping intervals, shared endpoint included", () => {
    expect(intervalsOverlap({ rank_ci_low: 7, rank_ci_high: 12 }, { rank_ci_low: 9, rank_ci_high: 15 })).toBe(true);
    expect(intervalsOverlap({ rank_ci_low: 1, rank_ci_high: 3 }, { rank_ci_low: 3, rank_ci_high: 5 })).toBe(true);
    expect(intervalsOverlap({ rank_ci_low: 1, rank_ci_high: 2 }, { rank_ci_low: 3, rank_ci_high: 5 })).toBe(false);
  });
});
