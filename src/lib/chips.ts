import type { Game } from "../types";

export type ChipId = "all" | "favorites" | "curated" | "hidden" | "underground" | "racing" | "handheld";

export const CHIP_ORDER: ChipId[] = ["all", "favorites", "curated", "hidden", "underground", "racing", "handheld"];

const CURATED = new Set(["Genre-Defining", "Must-Have", "Classic", "Hidden Gem", "Geheimtipp"]);
const GOOD_PLAY = new Set(["🟢 Sehr gut", "🟢 Gut"]);

export function matchesChip(game: Game, chip: ChipId, favoriteIds: ReadonlySet<string>): boolean {
  switch (chip) {
    case "all":
      return true;
    case "favorites":
      return favoriteIds.has(game.id);
    case "curated":
      return CURATED.has(game.category);
    case "hidden":
      return game.category === "Hidden Gem" || game.category === "Geheimtipp";
    case "underground":
      return game.category === "Underground" || game.category === "Nische";
    case "racing":
      return /racing/i.test(game.genre);
    case "handheld":
      return GOOD_PLAY.has(game.playability);
    default:
      return true;
  }
}

export function isGoodPlay(game: Game): boolean {
  return GOOD_PLAY.has(game.playability);
}
