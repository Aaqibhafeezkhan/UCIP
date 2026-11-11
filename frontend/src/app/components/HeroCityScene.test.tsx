import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

const invalidate = vi.fn();
const canvasProps: Array<Record<string, unknown>> = [];

// The real Canvas needs WebGL, which jsdom does not have. This one records the
// props it is given and renders no scene, so only RepaintOnShow is exercised
// directly, with a useThree that hands out the spy.
vi.mock("@react-three/fiber", () => ({
  Canvas: (props: Record<string, unknown> & { children?: ReactNode }) => {
    canvasProps.push(props);
    return null;
  },
  useThree: (select: (state: { invalidate: () => void }) => unknown) => select({ invalidate }),
}));

import HeroCityScene, { RepaintOnShow } from "./HeroCityScene";

const scene = (paused?: boolean) => (
  <HeroCityScene
    data={{ wards: [], extent: { width: 1, height: 1 } } as never}
    region={null}
    isDark={false}
    backgroundColor={null}
    hoveredId={null}
    onHover={() => {}}
    onSelect={() => {}}
    paused={paused}
  />
);

beforeEach(() => {
  invalidate.mockClear();
  canvasProps.length = 0;
});

describe("HeroCityScene", () => {
  it("paints on demand while the hero is on screen", () => {
    render(scene(false));
    expect(canvasProps.at(-1)?.frameloop).toBe("demand");
  });

  it("stops the frame loop while the hero is off screen, and resumes it", () => {
    const { rerender } = render(scene(true));
    expect(canvasProps.at(-1)?.frameloop).toBe("never");
    rerender(scene(false));
    expect(canvasProps.at(-1)?.frameloop).toBe("demand");
  });

  it("renders as sharp as it always did, on every device", () => {
    render(scene(false));
    expect(canvasProps.at(-1)?.dpr).toEqual([1, 1.75]);
    expect((canvasProps.at(-1)?.gl as { antialias: boolean }).antialias).toBe(true);
  });
});

describe("RepaintOnShow", () => {
  it("does no work while the hero is hidden", () => {
    render(<RepaintOnShow paused />);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("repaints once when the hero comes back, so a theme change made meanwhile shows", () => {
    const { rerender } = render(<RepaintOnShow paused />);
    rerender(<RepaintOnShow paused={false} />);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("does not keep repainting while the hero stays visible", () => {
    const { rerender } = render(<RepaintOnShow paused />);
    rerender(<RepaintOnShow paused={false} />);
    rerender(<RepaintOnShow paused={false} />);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it("repaints again on each return after hiding it again", () => {
    const { rerender } = render(<RepaintOnShow paused={false} />);
    invalidate.mockClear();
    rerender(<RepaintOnShow paused />);
    expect(invalidate).not.toHaveBeenCalled();
    rerender(<RepaintOnShow paused={false} />);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
