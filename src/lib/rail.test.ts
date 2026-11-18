import { describe, expect, it } from "vitest";
import { railWindow } from "./rail";

describe("cover rail window", () => {
  it("mounts only a handful of the installed titles at iPhone width", () => {
    const first = railWindow(0, 390, 372);
    expect(first.start).toBe(0);
    expect(first.end).toBeLessThan(16);
    const later = railWindow(146 * 40, 390, 372);
    expect(later.end - later.start).toBeLessThan(16);
    expect(later.start).toBeGreaterThan(30);
    expect(railWindow(0, 390, 0)).toEqual({ start: 0, end: 0 });
  });
});