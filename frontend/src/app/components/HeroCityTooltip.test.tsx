import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HeroCityTooltip from "./HeroCityTooltip";
import { stubMatchMedia } from "@/test/matchMediaStub";

afterEach(() => vi.unstubAllGlobals());

const tooltip = () => <HeroCityTooltip wardId="G/N" areas={["Dadar", "Mahim"]} x={10} y={20} />;

describe("HeroCityTooltip", () => {
  it("says Click where there is a pointer to hover with", () => {
    stubMatchMedia({ "(hover: none)": false });
    render(tooltip());
    expect(screen.getByText("Click to open in dashboard")).toBeInTheDocument();
  });

  it("says Tap on a touch screen", () => {
    stubMatchMedia({ "(hover: none)": true });
    render(tooltip());
    expect(screen.getByText("Tap to open in dashboard")).toBeInTheDocument();
  });

  it("follows the device when the input changes", () => {
    const media = stubMatchMedia({ "(hover: none)": false });
    render(tooltip());
    media.set("(hover: none)", true);
    expect(screen.getByText("Tap to open in dashboard")).toBeInTheDocument();
  });

  it("names the ward and its areas", () => {
    stubMatchMedia();
    render(tooltip());
    expect(screen.getByText("Ward G/N")).toBeInTheDocument();
    expect(screen.getByText("Dadar, Mahim")).toBeInTheDocument();
  });
});
