import { describe, expect, it } from "vitest";
import { decideSync, detectConflict, findRowById } from "./conflict";

describe("conflict detection", () => {
  it("treats null, empty and numeric formatting as the same cell", () => {
    expect(detectConflict(null, "")).toBe(false);
    expect(detectConflict(9, "9")).toBe(false);
    expect(detectConflict("9.0", 9)).toBe(false);
    expect(detectConflict(" Offen ", "Offen")).toBe(false);
  });

  it("flags a real change since load", () => {
    expect(detectConflict("Offen", "Installiert")).toBe(true);
    expect(detectConflict("", "neue notiz")).toBe(true);
    expect(detectConflict("9", "10")).toBe(true);
  });

  it("writes only when the sheet still has the loaded value", () => {
    expect(decideSync("Offen", "Offen", "Installiert")).toEqual({ type: "write" });
    expect(decideSync("", null, "hello")).toEqual({ type: "write" });
    expect(decideSync("9", 9, "8")).toEqual({ type: "write" });
  });

  it("does nothing when the sheet already has the desired value", () => {
    expect(decideSync("Offen", "Installiert", "Installiert")).toEqual({ type: "noop" });
    expect(decideSync("9", "8", 8)).toEqual({ type: "noop" });
  });

  it("asks when the sheet changed to a third value", () => {
    expect(decideSync("Offen", "Installiert", "Gespielt")).toEqual({
      type: "conflict",
      sheetValue: "Installiert",
      appValue: "Gespielt",
    });
    expect(decideSync("9", "10", "8")).toEqual({
      type: "conflict",
      sheetValue: "10",
      appValue: "8",
    });
    expect(decideSync("alte notiz", "Sheet-Text", "App-Text").type).toBe("conflict");
  });

  it("finds a row by ID and ignores the header", () => {
    const rows = [["ID"], ["ARC-0001"], ["SMS-0004"]];
    expect(findRowById(rows, 0, "SMS-0004")).toBe(2);
    expect(findRowById(rows, 0, "NOPE")).toBeNull();
    expect(findRowById(rows, 0, "  ")).toBeNull();
  });
});
