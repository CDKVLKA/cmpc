import { useMemo } from "react";
import { sysMeta } from "../lib/systems";
import { STATUS_DOT, STATUS_ORDER } from "../lib/taxonomy";
import { useCollection } from "../state/collection";
import type { Filters, Game } from "../types";
import { Cover } from "./bits";

function chrono(a: Game, b: Game): number {
  const year = (a.year ?? 9999) - (b.year ?? 9999);
  if (year) return year;
  return (a.releaseDate || "9999").localeCompare(b.releaseDate || "9999") || a.title.localeCompare(b.title, "de");
}
const played = (game: Game) => game.status === "Gespielt" || game.status === "Abgeschlossen";

export function SeriesIndex({ onOpen }: { onOpen: (name: string) => void }) {
  const { games, t } = useCollection();
  const series = useMemo(() => {
    const grouped = new Map<string, Game[]>();
    for (const game of games) {
      if (!game.series) continue;
      grouped.set(game.series, [...(grouped.get(game.series) ?? []), game]);
    }
    return [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0], "de"));
  }, [games]);
  if (!series.length) return <div className="page"><p className="empty">{t("seriesEmpty")}</p></div>;
  return (
    <div className="page series-page">
      <h1>{t("tabSeries")}</h1>
      <p className="lead">{t("seriesLead")}</p>
      {series.map(([name, list]) => (
        <section key={name}>
          <div className="rowh"><h2>{name}</h2><span>{list.length}</span></div>
          <div className="rail">
            {[...list].sort(chrono).slice(0, 14).map((game) => (
              <button key={game.id} type="button" className="cvcard" onClick={() => onOpen(name)}>
                <div className="cv"><Cover game={game} /></div>
                <div className="t">{game.title}</div>
                <div className="s">{sysMeta(game.system).abbr} · {game.year ?? ""}</div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function SeriesDetail({ name, onOpenGame, onStatus }: { name: string; onOpenGame: (id: string) => void; onStatus: (filters: Partial<Filters>) => void }) {
  const { games, t } = useCollection();
  const list = games.filter((game) => game.series === name).sort(chrono);
  const done = list.filter(played).length;
  const counts = STATUS_ORDER.map((status) => ({ status, count: list.filter((game) => game.status === status).length })).filter((item) => item.count);
  return (
    <div className="page">
      <h1>{name}</h1>
      <p className="lead">{t("seriesProgress", { done, total: list.length })}</p>
      <div className="progress"><i style={{ width: `${list.length ? (done / list.length) * 100 : 0}%` }} /></div>
      <div className="stat">
        {counts.map((item) => (
          <button key={item.status} type="button" onClick={() => onStatus({ series: [name], status: [item.status] })}>
            <span className="dot" style={{ background: STATUS_DOT[item.status] }} />{item.status} <b>{item.count}</b>
          </button>
        ))}
      </div>
      <div className="stack">
        {list.map((game) => (
          <button key={game.id} type="button" className="row" onClick={() => onOpenGame(game.id)}>
            <span className="th"><Cover game={game} /></span>
            <span className="rt"><b>{game.title}</b><small>{game.releaseDate || game.year || ""} · {game.system}</small></span>
            <span className="dot" style={{ background: STATUS_DOT[game.status] ?? "#999" }} />
          </button>
        ))}
      </div>
    </div>
  );
}
