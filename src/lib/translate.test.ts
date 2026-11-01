import { describe, expect, it } from "vitest";
import { translateProse, translateValue } from "./translate";
import type { Dictionary } from "../types";

const dict: Dictionary = {
  Status: { Offen: "Open", Installiert: "Installed" },
  "Spielbarkeit RG477V": { "🟢 Sehr gut": "🟢 Very good" },
  Spielzeit: { "▰▱▱ Kurz": "▰▱▱ Short", "h gesamt": "h total" },
  Tags: { Koop: "Co-op", "Kult-Klassiker": "Cult Classic" },
  Tier: { unbewertet: "unrated", "(Einschätzung)": "(estimate)" },
  Region: { unklar: "unclear", "+ Fan-Übersetzung": "+ fan translation" },
  Kategorie: { Geheimtipp: "Insider Tip" },
  Spaltennamen: { Titel: "Title", "Eigene Notizen": "My notes" },
};

describe("translation fallback", () => {
  it("keeps German when the language is German or the English entry is missing", () => {
    expect(translateValue(dict, "Status", "Offen", "de")).toBe("Offen");
    expect(translateValue(dict, "Status", "Offen", "en")).toBe("Open");
    expect(translateValue(dict, "Status", "Ausgewählt", "en")).toBe("Ausgewählt");
    expect(translateValue(dict, "Kategorie", "Geheimtipp", "en")).toBe("Insider Tip");
  });

  it("never translates genre or personal notes", () => {
    expect(translateValue(dict, "Genre", "Shoot ’em up", "en")).toBe("Shoot ’em up");
    expect(translateValue(dict, "Eigene Notizen", "andere Version: MSX2", "en")).toBe("andere Version: MSX2");
  });

  it("translates list values that are composed, and falls back per piece", () => {
    expect(translateValue(dict, "Spielzeit", "▰▱▱ Kurz (2,1 h)", "en")).toBe("▰▱▱ Short (2.1 h)");
    expect(translateValue(dict, "Tags", "Koop, Unbekannt", "en")).toBe("Co-op, Unbekannt");
    expect(translateValue(dict, "Tier", "S (Einschätzung)", "en")).toBe("S (estimate)");
    expect(translateValue(dict, "Tier", "unbewertet", "en")).toBe("unrated");
    expect(translateValue(dict, "Region", "JP · unklar + Fan-Übersetzung", "en")).toBe("JP · unclear + fan translation");
  });

  it("uses the English prose column and falls back to German when it is empty", () => {
    expect(translateProse("Starker Disney-Plattformer.", "Strong Disney platformer.", "en")).toBe("Strong Disney platformer.");
    expect(translateProse("Starker Disney-Plattformer.", "  ", "en")).toBe("Starker Disney-Plattformer.");
    expect(translateProse("Starker Disney-Plattformer.", "Strong Disney platformer.", "de")).toBe("Starker Disney-Plattformer.");
  });
});
