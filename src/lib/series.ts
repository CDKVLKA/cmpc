import type { Game } from "../types";
import { str } from "./text";

const TRAILING =
  /\s+(?:\d{1,2}|i{1,3}|iv|vi{0,3}|ix|xi|xii|remaster(?:ed)?|remake|hd|dx|deluxe|collection|anthology|trilogy|returns|rebirth)\s*$/i;

/** Strip subtitles and trailing numbers so "Metal Gear Solid 2" and "Metal Gear Solid" can meet. */
export function deriveSeriesName(title: string): string {
  let name = title.split(/[:：]/)[0] ?? title;
  name = name.replace(/\s+[–—-]\s+.*$/, "");
  name = name.replace(/\s*\([^)]*\)\s*/g, " ");
  let previous = "";
  while (name !== previous) {
    previous = name;
    name = name.replace(TRAILING, "").replace(/\s+/g, " ").trim();
  }
  return name;
}

export interface SeriesGroup {
  name: string;
  games: Game[];
  /** True when the sheet's Serie cell was empty and the name was derived from titles. */
  derived: boolean;
}

export function seriesGroups(games: readonly Game[]): SeriesGroup[] {
  const explicit = new Map<string, Game[]>();
  const loose: Game[] = [];
  for (const game of games) {
    const named = str(game.series);
    if (named) {
      const list = explicit.get(named) ?? [];
      list.push(game);
      explicit.set(named, list);
    } else {
      loose.push(game);
    }
  }
  const derived = new Map<string, Game[]>();
  for (const game of loose) {
    const key = deriveSeriesName(game.title);
    if (key.length < 3 || explicit.has(key)) continue;
    const list = derived.get(key) ?? [];
    list.push(game);
    derived.set(key, list);
  }
  const groups: SeriesGroup[] = [];
  for (const [name, list] of explicit) groups.push({ name, games: list, derived: false });
  for (const [name, list] of derived) {
    if (list.length < 2) continue;
    groups.push({ name, games: list, derived: true });
  }
  return groups.sort((a, b) => a.name.localeCompare(b.name, "de") || b.games.length - a.games.length);
}

export function gamesInSeries(games: readonly Game[], name: string): Game[] {
  return seriesGroups(games).find((group) => group.name === name)?.games ?? [];
}
