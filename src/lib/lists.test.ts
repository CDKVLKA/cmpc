import { describe, expect, it } from "vitest";
import { emptyLists, localListRepository, normalizeLists, toggleId } from "./lists";

function memory() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

describe("local lists", () => {
  it("round-trips favorites and custom lists", () => {
    const store = memory();
    const repo = localListRepository(store);
    expect(repo.load()).toEqual(emptyLists());
    repo.save({ version: 1, favorites: ["PS1-0001"], custom: [{ id: "a", name: "Nacht", gameIds: ["PS1-0001", "PS1-0001"] }] });
    expect(repo.load().favorites).toEqual(["PS1-0001"]);
    expect(repo.load().custom[0]?.name).toBe("Nacht");
  });

  it("drops broken records and toggles membership", () => {
    expect(normalizeLists({ favorites: [1, "A"], custom: [{ id: "", name: "x" }, { id: "b", name: "Ok", gameIds: ["Z"] }] }).custom).toEqual([
      { id: "b", name: "Ok", gameIds: ["Z"] },
    ]);
    expect(toggleId(["A"], "B")).toEqual(["A", "B"]);
    expect(toggleId(["A", "B"], "A")).toEqual(["B"]);
  });
});
