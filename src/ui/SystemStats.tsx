import { PLAY_ORDER, PLAYTIME_ORDER, STATUS_DOT, TIER_BG, TIER_ORDER } from "../lib/taxonomy";
import { tierKey } from "../lib/text";
import { useCollection } from "../state/collection";
import type { Filters, Game } from "../types";

const played = (game: Game) => game.status === "Gespielt" || game.status === "Abgeschlossen";

export function ProgressRings({ games, onFilter }: { games: Game[]; onFilter: (filters: Partial<Filters>) => void }) {
  const { t } = useCollection();
  const total = games.length || 1;
  const items = [
    { key: "Offen", label: t("openStatus"), value: games.filter((game) => game.status === "Offen").length, color: STATUS_DOT.Offen ?? "#AEB6C4", filters: { status: ["Offen"] } },
    { key: "Installiert", label: t("installed"), value: games.filter((game) => game.status === "Installiert").length, color: STATUS_DOT.Installiert ?? "#5DBB7A", filters: { status: ["Installiert"] } },
    { key: "Gespielt", label: t("playedStatus"), value: games.filter(played).length, color: STATUS_DOT.Gespielt ?? "#5B9BEA", filters: { status: ["Gespielt", "Abgeschlossen"] } },
  ];
  return (
    <div className="rings">
      {items.map((item) => {
        const radius = 36;
        const circ = 2 * Math.PI * radius;
        return (
          <button key={item.key} type="button" className="ringbtn" onClick={() => onFilter(item.filters)}>
            <svg viewBox="0 0 100 100" className="ring" aria-hidden="true">
              <circle cx="50" cy="50" r={radius} className="ringbg" />
              <circle cx="50" cy="50" r={radius} className="ringfg" stroke={item.color} strokeDasharray={`${circ * (item.value / total)} ${circ}`} />
              <text x="50" y="54" textAnchor="middle">{item.value}</text>
            </svg>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SystemStats({ name, onFilter }: { name: string; onFilter: (filters: Partial<Filters>) => void }) {
  const { games, t } = useCollection();
  const mine = games.filter((game) => game.system === name);
  const scope = (partial: Partial<Filters>) => onFilter({ system: [name], ...partial });
  return (
    <div className="page">
      <h1>{name}</h1>
      <p className="lead">{mine.length} {t("titles")}</p>
      <ProgressRings games={mine} onFilter={scope} />
      <BarBlock title={t("cTier")} rows={count(mine, (game) => tierKey(game.tier), [...TIER_ORDER])} color={(key) => TIER_BG[key] ?? "#d5dbe6"} onPick={(key) => scope({ tier: [key] })} />
      <BarBlock title={t("fGenre")} rows={count(mine, (game) => game.genre, [])} color={() => "#7aa8ff"} onPick={(key) => scope({ genre: [key] })} />
      <BarBlock title={t("cPlay")} rows={count(mine, (game) => game.playability, [...PLAY_ORDER])} color={() => "#9ee0b4"} onPick={(key) => scope({ play: [key] })} />
      <BarBlock title={t("fTime")} rows={count(mine, (game) => game.playtimeBucket, [...PLAYTIME_ORDER])} color={() => "#f2c14e"} onPick={(key) => scope({ playtime: [key] })} />
    </div>
  );
}

function count(games: Game[], pick: (game: Game) => string, preferred: string[]) {
  const map = new Map<string, number>();
  for (const game of games) {
    const key = pick(game);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const extras = [...map.keys()].filter((key) => !preferred.includes(key)).sort((a, b) => (map.get(b) ?? 0) - (map.get(a) ?? 0));
  return [...preferred.filter((key) => map.has(key)), ...extras].map((key) => ({ key, value: map.get(key) ?? 0 }));
}

function BarBlock({ title, rows, color, onPick }: { title: string; rows: { key: string; value: number }[]; color: (key: string) => string; onPick: (key: string) => void }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (!rows.length) return null;
  return (
    <section className="chart">
      <h3>{title}</h3>
      <div className="hbars">
        {rows.map((row) => (
          <button key={row.key} type="button" onClick={() => onPick(row.key)}>
            <span>{row.key}</span>
            <i><b style={{ width: `${(row.value / max) * 100}%`, background: color(row.key) }} /></i>
            <b>{row.value}</b>
          </button>
        ))}
      </div>
    </section>
  );
}
