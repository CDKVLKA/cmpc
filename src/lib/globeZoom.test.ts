import { describe, expect, it } from "vitest";
import { clampGlobeZoom, globeZoomByPinch, globeZoomByWheel, globeZoomStep } from "./globeZoom";

describe("globe zoom", () => {
  it("stays between 1× and 6×", () => {
    expect(clampGlobeZoom(0.2)).toBe(1);
    expect(clampGlobeZoom(3)).toBe(3);
    expect(clampGlobeZoom(12)).toBe(6);
    expect(clampGlobeZoom(Number.NaN)).toBe(1);
  });

  it("zooms in with an upward wheel and out with a downward wheel", () => {
    expect(globeZoomByWheel(2, -100, false)).toBeGreaterThan(2);
    expect(globeZoomByWheel(2, 100, false)).toBeLessThan(2);
    expect(globeZoomByWheel(1, 400, false)).toBe(1);
    expect(globeZoomByWheel(6, -400, true)).toBe(6);
  });

  it("follows a two-finger pinch and steps from the buttons", () => {
    expect(globeZoomByPinch(2, 100, 200)).toBe(4);
    expect(globeZoomByPinch(2, 0, 200)).toBe(2);
    expect(globeZoomStep(1, 1)).toBeCloseTo(1.4);
    expect(globeZoomStep(6, 1)).toBe(6);
    expect(globeZoomStep(1, -1)).toBe(1);
  });
});
