import { describe, expect, it } from "vitest";
import { cellsForHeaders, deleteSheetRows } from "../sheets/api";

describe("sheet writes", () => {
  it("fills only named headers and leaves every other cell blank", () => {
    const row = cellsForHeaders(["ID", "Titel", "System", "Jahr", "Notizen"], {
      ID: "PS1-0099",
      Titel: "Demo",
      Jahr: 1998,
      Fehlend: "nope",
    });
    expect(row).toEqual(["PS1-0099", "Demo", "", 1998, ""]);
  });

  it("refuses to delete rows", async () => {
    await expect(deleteSheetRows("token", "Gesamtliste", [4, 5])).rejects.toThrow(/nicht gelöscht/);
  });
});
