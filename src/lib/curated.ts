import { tierKey } from "./text";
import type { Game } from "../types";

export interface CuratedList {
  id: string;
  games: (games: readonly Game[]) => Game[];
}

function bySystem(games: Game[]): Game[] {
  return [...games].sort((a, b) => a.system.localeCompare(b.system, "de") || a.title.localeCompare(b.title, "de"));
}

export const CURATED: CuratedList[] = [
  {
    id: "cyberpunk",
    games: (games) => bySystem(games.filter((game) => game.cyberpunk === "Kern" || game.cyberpunk === "Nah" || game.tags.includes("Cyberpunk"))),
  },
  {
    id: "fan-translations",
    games: (games) => bySystem(games.filter((game) => game.tags.includes("Fan-Übersetzung"))),
  },
  {
    id: "lost-media",
    games: (games) => bySystem(games.filter((game) => game.tags.includes("Lost Media") || game.tags.includes("CD-ROM-Kunst") || Boolean(game.preservation))),
  },
  {
    id: "s-tier",
    games: (games) => bySystem(games.filter((game) => tierKey(game.tier) === "S")),
  },
  {
    id: "hidden-gems",
    games: (games) => bySystem(games.filter((game) => game.status === "Offen" && (tierKey(game.tier) === "S" || tierKey(game.tier) === "A"))),
  },
];

export function curatedById(id: string): CuratedList | undefined {
  return CURATED.find((list) => list.id === id);
}
