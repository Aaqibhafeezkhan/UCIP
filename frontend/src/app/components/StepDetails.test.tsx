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
});
