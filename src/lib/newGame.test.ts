import { describe, expect, it } from "vitest";
import { nextGameId, sameTitleAndSystem } from "./newGame";

describe("new titles", () => {
  it("continues the system's id sequence and finds an existing title", () => {
    const games = [
      { id: "PS1-0002", title: "Castlevania", system: "PlayStation 1" },
      { id: "PS1-0010", title: "Other", system: "PlayStation 1" },
      { id: "PC-0004", title: "Deus Ex", system: "PC" },
    ];
    expect(nextGameId(games, "PlayStation 1")).toBe("PS1-0011");
    expect(nextGameId(games, "NES")).toBe("NES-0001");
    expect(sameTitleAndSystem(games, " deus ex ", "PC")?.id).toBe("PC-0004");
    expect(sameTitleAndSystem(games, "Deus Ex", "PlayStation 1")).toBeUndefined();
  });
});
