import { tierKey } from "./text";

export interface HeatGame {
  system: string;
  playability: string;
  tier: string;
}

export interface HeatRow {
  system: string;
  total: number;
  play: Record<string, number>;
  tier: Record<string, number>;
}

export function aggregateHeatmaps(games: readonly HeatGame[]): HeatRow[] {
  const map = new Map<string, HeatRow>();
  for (const game of games) {
    const system = game.system.trim() || "–";
    let row = map.get(system);
    if (!row) {
      row = { system, total: 0, play: {}, tier: {} };
      map.set(system, row);
    }
    row.total += 1;
    const play = game.playability.trim();
    if (play) row.play[play] = (row.play[play] ?? 0) + 1;
    const tier = tierKey(game.tier);
    row.tier[tier] = (row.tier[tier] ?? 0) + 1;
  }
  return [...map.values()].sort(
    (a, b) => b.total - a.total || a.system.localeCompare(b.system, "de"),
  );
}
