import type { Filters, Game, SortKey } from "../types";
import { tierRank } from "./taxonomy";
import { tierKey as toTierKey } from "./text";

export function emptyFilters(): Filters {
  return {
    system: [],
    tier: [],
    play: [],
    status: [],
    genre: [],
    category: [],
    playtime: [],
    series: [],
    tags: [],
    cyber: [],
  };
}

export function hasFilters(filters: Filters): boolean {
  return Object.values(filters).some((list) => list.length > 0);
}

export function matchesFilters(game: Game, filters: Filters): boolean {
  if (filters.system.length && !filters.system.includes(game.system)) return false;
  if (filters.tier.length && !filters.tier.includes(toTierKey(game.tier))) return false;
  if (filters.play.length && !filters.play.includes(game.playability)) return false;
  if (filters.status.length && !filters.status.includes(game.status)) return false;
  if (filters.genre.length && !filters.genre.includes(game.genre)) return false;
  if (filters.category.length && !filters.category.includes(game.category)) return false;
  if (filters.playtime.length && !filters.playtime.includes(game.playtimeBucket)) return false;
  if (filters.series.length && !filters.series.includes(game.series)) return false;
  if (filters.tags.length && !game.tags.some((tag) => filters.tags.includes(tag))) return false;
  if (filters.cyber.length && !filters.cyber.includes(game.cyberpunk)) return false;
  return true;
}

export function compareGames(a: Game, b: Game, sort: SortKey): number {
  switch (sort) {
    case "title":
      return a.title.localeCompare(b.title, "de") || a.id.localeCompare(b.id);
    case "year":
      return (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title, "de");
    case "tier":
      return tierRank(a.tier) - tierRank(b.tier) || a.title.localeCompare(b.title, "de");
    case "system":
      return a.system.localeCompare(b.system, "de") || tierRank(a.tier) - tierRank(b.tier) || a.title.localeCompare(b.title, "de");
    case "rating":
      return (b.rating ?? -1) - (a.rating ?? -1) || tierRank(a.tier) - tierRank(b.tier) || a.title.localeCompare(b.title, "de");
    default:
      return 0;
  }
}

export function applyTextAndFilters(
  games: readonly Game[],
  scores: Map<string, number> | null,
  filters: Filters,
  sort: SortKey,
): Game[] {
  const pool = scores ? games.filter((game) => scores.has(game.id)) : games;
  const matched = pool.filter((game) => matchesFilters(game, filters));
  return [...matched].sort((a, b) => {
    if (scores) {
      const delta = (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0);
      if (delta) return delta;
    }
    return compareGames(a, b, sort);
  });
}

export function fieldString(game: Game, field: "status" | "rating" | "notes"): string {
  if (field === "status") return game.status;
  if (field === "notes") return game.notes;
  return game.rating == null ? "" : String(game.rating);
}

export function withField(game: Game, field: "status" | "rating" | "notes", value: string): Game {
  if (field === "status") return { ...game, status: value || "Offen" };
  if (field === "notes") return { ...game, notes: value };
  const rating = value ? Number(value) : null;
  return { ...game, rating: rating && rating >= 1 && rating <= 10 ? rating : null };
}
