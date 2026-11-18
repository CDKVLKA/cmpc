import { useMemo, useState } from "react";
import { gamesInSeries, seriesGroups } from "../lib/series";
import { sysMeta } from "../lib/systems";
import { STATUS_ORDER } from "../lib/taxonomy";
import { useCollection } from "../state/collection";
import type { Game } from "../types";

const played = (game: Game) => game.status === "Gespielt" || game.status === "Abgeschlossen";

export function SeriesIndex({ games, onOpen }: { games: Game[]; onOpen: (name: string) => void }) {
  const { t } = useCollection();
  const series = useMemo(() => seriesGroups(games), [games]);
  if (!series.length) return <div className="page"><p className="empty">{t("seriesEmpty")}</p></div>;
  return (
    <div className="page series-page">
      <h1>{t("tabSeries")}</h1>
      <p className="lead">{t("seriesLead")}</p>
      <div className="series-grid">
        {series.map((group) => {
          const done = group.games.filter(played).length;
          const systems = [...new Set(group.games.map((game) => sysMeta(game.system).abbr))];
          return (
            <button key={group.name} type="button" className="seriescard" onClick={() => onOpen(group.name)}>
              <b>{group.name}</b>
              <span>{group.games.length} {t("titles")}</span>
              <small>{systems.slice(0, 4).join(" · ")}{systems.length > 4 ? " …" : ""}</small>
              <i><em style={{ width: `${group.games.length ? (done / group.games.length) * 100 : 0}%` }} /></i>
              <span>{t("seriesProgress", { done, total: group.games.length })}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SeriesDetail({ name, games, onOpenGame }: { name: string; games: Game[]; onOpenGame: (id: string) => void }) {
  const { t } = useCollection();
  const [status, setStatus] = useState<string | null>(null);
  const all = useMemo(() => gamesInSeries(games, name).sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999) || a.title.localeCompare(b.title, "de")), [games, name]);
  const list = status ? all.filter((game) => game.status === status) : all;
  const done = all.filter(played).length;
  const counts = STATUS_ORDER.map((item) => ({ status: item, count: all.filter((game) => game.status === item).length })).filter((item) => item.count);
  return (
    <div className="page">
      <h1>{name}</h1>
      <p className="lead">{t("seriesProgress", { done, total: all.length })}</p>
      <div className="chips">
        {counts.map((item) => (
          <button key={item.status} type="button" className={`chip${status === item.status ? " on" : ""}`} onClick={() => setStatus(status === item.status ? null : item.status)}>
            {item.status} <span className="cnt">{item.count}</span>
          </button>
        ))}
      </div>
      <div className="toplist">
        {list.map((game) => (
          <button key={game.id} type="button" className="toprow" onClick={() => onOpenGame(game.id)}>
            <span className="rt"><b>{game.title}</b><small>{sysMeta(game.system).abbr} · {game.year ?? t("none")} · {game.status || t("none")}</small></span>
          </button>
        ))}
      </div>
    </div>
  );
}
