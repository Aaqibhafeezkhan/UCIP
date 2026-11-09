import { describe, it, expect, afterEach, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { StepCard } from "./Card";
import { stubMatchMedia } from "@/test/matchMediaStub";

const WIDE = "(min-width: 768px)";

afterEach(() => {
  vi.unstubAllGlobals();
  window.location.hash = "";
});

function renderStep() {
  const view = render(
    <StepCard step={5} id="sources" collapsible title="Every source">
      <p>The papers</p>
    </StepCard>
  );
  return { ...view, details: view.container.querySelector("details") as HTMLDetailsElement };
}

describe("a collapsible step", () => {
  it("is server rendered open, so it reads in full without scripts", () => {
    const html = renderToString(
      <StepCard step={5} id="sources" collapsible title="Every source">
        <p>The papers</p>
      </StepCard>
    );
    expect(html).toMatch(/<details[^>]* open=""/);
    expect(html).toContain("The papers");
  });

  it("closes on a phone once mounted", () => {
    stubMatchMedia();
    expect(renderStep().details.open).toBe(false);
  });

  it("stays open from md up, even when closed from the keyboard", () => {
    stubMatchMedia({ [WIDE]: true });
    const { details } = renderStep();
    expect(details.open).toBe(true);
    act(() => {
      details.open = false;
      details.dispatchEvent(new Event("toggle"));
    });
    expect(details.open).toBe(true);
  });

  it("opens when the page loads on its anchor", () => {
    stubMatchMedia();
    window.location.hash = "#sources";
    expect(renderStep().details.open).toBe(true);
  });

  it("opens when a link to its anchor is followed", () => {
    stubMatchMedia();
    const { details } = renderStep();
    expect(details.open).toBe(false);
    act(() => {
      window.location.hash = "#sources";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(details.open).toBe(true);
  });

  it("opens to print and goes back to how the reader left it", () => {
    stubMatchMedia();
    const { details } = renderStep();
    act(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });
    expect(details.open).toBe(true);
    act(() => {
      window.dispatchEvent(new Event("afterprint"));
    });
    expect(details.open).toBe(false);
  });

  it("opens when a link to its anchor is clicked and the hash is already that anchor", () => {
    stubMatchMedia();
    window.location.hash = "#sources";
    const { details } = renderStep();
    act(() => {
      details.open = false;
    });
    const chip = document.createElement("a");
    chip.setAttribute("href", "#sources");
    document.body.appendChild(chip);
    act(() => chip.click());
    chip.remove();
    expect(details.open).toBe(true);
  });

  it("ignores links to anchors outside the step", () => {
    stubMatchMedia();
    const { details } = renderStep();
    const other = document.createElement("a");
    other.setAttribute("href", "#limitations");
    document.body.appendChild(other);
    act(() => other.click());
    other.remove();
    expect(details.open).toBe(false);
  });

  it("scrolls back to the anchor after folding, when the page opened on another one", () => {
    stubMatchMedia();
    const scrolled: string[] = [];
    const target = document.createElement("div");
    target.id = "limitations";
    target.scrollIntoView = () => {
      scrolled.push("limitations");
    };
    document.body.appendChild(target);
    window.location.hash = "#limitations";
    const { details } = renderStep();
    target.remove();
    expect(details.open).toBe(false);
    expect(scrolled).toEqual(["limitations"]);
  });

  it("does not scroll when the page has no anchor", () => {
    stubMatchMedia();
    const spy = vi.fn();
    Element.prototype.scrollIntoView = spy;
    renderStep();
    expect(spy).not.toHaveBeenCalled();
  });
});
