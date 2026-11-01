import { useEffect } from "react";
import { useCollection } from "../state/collection";
import { sysMeta } from "../lib/systems";
import { tierRank } from "../lib/taxonomy";
import type { Filters, Game } from "../types";
import { Cover } from "./bits";

const CATEGORY_RANK = ["Genre-Defining", "Must-Have", "Classic", "Mainstream", "Hidden Gem", "Geheimtipp", "Underground", "Nische", "Optional"];
const RAIL = 18;

function byTier(games: Game[]): Game[] {
  return [...games].sort((a, b) => tierRank(a.tier) - tierRank(b.tier) || a.title.localeCompare(b.title, "de"));
}

function topGame(games: Game[]): Game | undefined {
  return [...games].sort((a, b) => {
    const tier = tierRank(a.tier) - tierRank(b.tier);
    if (tier) return tier;
    const category = (CATEGORY_RANK.indexOf(a.category) + 1 || 99) - (CATEGORY_RANK.indexOf(b.category) + 1 || 99);
    return category || a.title.localeCompare(b.title, "de");
  })[0];
}

interface Props {
  sysIndex: number;
  onIndex: (index: number) => void;
  onEnter: (system: string) => void;
  onOpen: (id: string) => void;
  onRail: (filters: Partial<Filters>) => void;
}

export function HomeView({ sysIndex, onIndex, onEnter, onOpen, onRail }: Props) {
  const { games, t } = useCollection();
  const counts = new Map<string, number>();
  for (const game of games) counts.set(game.system, (counts.get(game.system) ?? 0) + 1);
  const systems = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"));
  const safeIndex = systems.length ? ((sysIndex % systems.length) + systems.length) % systems.length : 0;
  const current = systems[safeIndex];
  const name = current?.[0] ?? "";
  const meta = sysMeta(name);
  const mine = games.filter((game) => game.system === name);
  const installed = mine.filter((game) => game.status === "Installiert" || game.status === "Ausgewählt").length;
  const top = topGame(mine);
  const locale = document.documentElement.lang === "en" ? "en-US" : "de-DE";

  useEffect(() => {
    document.querySelector(`[data-sys="${safeIndex}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [safeIndex, name]);

  const rail = (title: string, hint: string, list: Game[], filters: Partial<Filters>) => {
    if (!list.length) return null;
    const shown = list.slice(0, RAIL);
    return (
      <>
        <div className="rowh">
          <h2>{title}</h2>
          <span>{hint}</span>
        </div>
        <div className="rail">
          {shown.map((game) => (
            <button key={game.id} type="button" className="cvcard" data-id={game.id} onClick={() => onOpen(game.id)}>
              <div className="cv">
                <Cover game={game} />
              </div>
              <div className="t">{game.title}</div>
              <div className="s">
                {sysMeta(game.system).abbr} · {game.year ?? ""}
              </div>
            </button>
          ))}
          {list.length > shown.length ? (
            <button type="button" className="cvcard more" onClick={() => onRail(filters)}>
              <div className="cv ph">
                {t("seeAll")}
                <small>{list.length}</small>
              </div>
            </button>
          ) : null}
        </div>
      </>
    );
  };

  if (!current) return null;
  return (
    <div className="home" id="home">
      <div className="hero2">
        <div className="wall" style={{ background: `linear-gradient(120deg, ${meta.from} 0%, ${meta.to} 72%, ${meta.to}88 100%)` }} />
        {top?.coverUrl ? <div className="wallimg" style={{ backgroundImage: `url('${top.coverUrl}')` }} /> : null}
        <div className="in">
          <div className="kick">
            {meta.maker ? `${meta.maker} · ` : ""}
            {t("systems")} {safeIndex + 1}/{systems.length}
          </div>
          <h1>{name}</h1>
          <div className="facts">
            <span>
              <b>{current[1].toLocaleString(locale)}</b>
              {t("titles")} {t("inCollection")}
            </span>
            <span>
              <b>{installed.toLocaleString(locale)}</b>
              {t("installed")}
            </span>
            {top ? (
              <span>
                <b className="toppick">{top.title}</b>
                {t("topPick")}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="rowh">
        <h2>{t("systems")}</h2>
        <span>{t("systemsHint")}</span>
      </div>
      <div className="rail" id="sysrail">
        {systems.map(([system, count], index) => {
          const card = sysMeta(system);
          return (
            <button
              key={system}
              type="button"
              className={`syscard${index === safeIndex ? " cur" : ""}`}
              data-sys={index}
              style={{ background: `linear-gradient(135deg, ${card.from}, ${card.to})` }}
              onFocus={() => onIndex(index)}
              onClick={() => (index === safeIndex ? onEnter(system) : onIndex(index))}
            >
              <span className="ct">{count}</span>
              <span className="mk">{card.maker}</span>
              <span>
                <span className="ab">{card.abbr}</span>
                <span className="nm">{system}</span>
              </span>
            </button>
          );
        })}
      </div>
      {rail(
        t("rowNext"),
        t("rowNextHint"),
        byTier(games.filter((game) => game.status === "Installiert" || game.status === "Ausgewählt")),
        { status: ["Installiert", "Ausgewählt"] },
      )}
      {rail(
        t("rowS"),
        "",
        byTier(games.filter((game) => tierRank(game.tier) === 0)),
        { tier: ["S"] },
      )}
      {rail(
        t("rowCyber"),
        "Kern / Nah",
        byTier(games.filter((game) => game.cyberpunk === "Kern" || game.cyberpunk === "Nah")),
        { cyber: ["Kern", "Nah"] },
      )}
      {rail(
        "Genre-Defining",
        "",
        byTier(games.filter((game) => game.category === "Genre-Defining")),
        { category: ["Genre-Defining"] },
      )}
    </div>
  );
}
