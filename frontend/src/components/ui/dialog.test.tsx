import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  type DialogPlacement,
} from "./dialog";

/**
 * jsdom loads no CSS, so these pin the placement contract through the class
 * names the dialog renders rather than through layout. The `bottom` and
 * `phone-bottom` cases guard the regression this contract exists for: a sheet
 * that still carries the centred box's translate and zoom classes slides in
 * from the wrong place and zooms on the way.
 */

function renderPlacement(placement?: DialogPlacement, className?: string) {
  render(
    <Dialog open>
      <DialogContent placement={placement} className={className}>
        <DialogTitle>Title</DialogTitle>
        <DialogDescription>Description</DialogDescription>
      </DialogContent>
    </Dialog>
  );
  // Radix portals both to <body>, so query the document, not the render container.
  const content = document.querySelector<HTMLElement>('[data-slot="dialog-content"]')!;
  const overlay = document.querySelector<HTMLElement>('[data-slot="dialog-overlay"]')!;
  return { content, overlay, classes: Array.from(content.classList) };
}

const SLIDE = /slide-(in-from|out-to)-/;
const CENTRING = /top-1\/2|left-1\/2|translate-[xy]|zoom-(in|out)-/;

describe("DialogContent placement", () => {
  it("defaults to center", () => {
    const { classes } = renderPlacement();
    expect(classes).toContain("top-1/2");
    expect(classes).toContain("max-w-lg");
  });

  it("center keeps the centring and the zoom", () => {
    const { classes, overlay } = renderPlacement("center");

    expect(classes).toEqual(
      expect.arrayContaining([
        "top-1/2",
        "left-1/2",
        "-translate-x-1/2",
        "-translate-y-1/2",
        "max-w-lg",
        "data-[state=open]:zoom-in-95",
        "data-[state=closed]:zoom-out-95",
      ])
    );
    expect(classes.some((c) => SLIDE.test(c))).toBe(false);
    expect(overlay.className).not.toContain("duration-sheet");
  });

  it("bottom is pinned to the bottom edge with no centring, zoom or width cap", () => {
    const { classes, overlay } = renderPlacement("bottom");

    expect(classes).toEqual(
      expect.arrayContaining([
        "inset-x-0",
        "bottom-0",
        "data-[state=open]:slide-in-from-bottom",
        "data-[state=closed]:slide-out-to-bottom",
        "duration-sheet",
        "ease-sheet",
      ])
    );
    for (const gone of ["top-1/2", "left-1/2", "-translate-x-1/2", "zoom-in-95", "max-w-lg"]) {
      expect(classes.join(" ")).not.toContain(gone);
    }
    expect(classes.some((c) => CENTRING.test(c))).toBe(false);
    // The scrim fades at the sheet's pace so it does not finish before the panel.
    expect(overlay.className).toContain("duration-sheet");
    expect(overlay.className).toContain("ease-sheet");
  });

  it("right slides in from the right edge", () => {
    const { classes, overlay } = renderPlacement("right");

    expect(classes).toEqual(
      expect.arrayContaining([
        "inset-y-0",
        "right-0",
        "data-[state=open]:slide-in-from-right",
        "data-[state=closed]:slide-out-to-right",
        "duration-sheet",
      ])
    );
    expect(classes.some((c) => CENTRING.test(c))).toBe(false);
    expect(overlay.className).toContain("duration-sheet");
  });

  it("phone-bottom slides below md and centres from md up, never both at once", () => {
    const { classes, overlay } = renderPlacement("phone-bottom");

    const slides = classes.filter((c) => SLIDE.test(c));
    expect(slides).toEqual(
      expect.arrayContaining([
        "max-md:data-[state=open]:slide-in-from-bottom",
        "max-md:data-[state=closed]:slide-out-to-bottom",
      ])
    );
    expect(slides.every((c) => c.startsWith("max-md:"))).toBe(true);

    const centring = classes.filter((c) => CENTRING.test(c));
    expect(centring).toEqual(
      expect.arrayContaining([
        "md:top-1/2",
        "md:left-1/2",
        "md:-translate-x-1/2",
        "md:-translate-y-1/2",
        "md:data-[state=open]:zoom-in-95",
        "md:data-[state=closed]:zoom-out-95",
      ])
    );
    expect(centring.every((c) => c.startsWith("md:"))).toBe(true);

    expect(classes).toEqual(expect.arrayContaining(["max-md:inset-x-0", "max-md:bottom-0"]));
    expect(overlay.className).toContain("max-md:duration-sheet");
    expect(overlay.className).not.toMatch(/(^|\s)duration-sheet/);
  });

  it("lets a caller's classes win over the placement's without losing the rest", () => {
    const { classes } = renderPlacement("phone-bottom", "max-md:max-h-[90dvh] md:max-w-md");

    expect(classes).toContain("md:max-w-md");
    expect(classes).not.toContain("md:max-w-lg");
    expect(classes).toContain("max-md:max-h-[90dvh]");
    // The desktop height cap stays, since the caller only raised it below md.
    expect(classes).toContain("max-h-[min(85dvh,100dvh-2rem)]");
    expect(classes).toContain("max-md:inset-x-0");
  });
});
