import { useMemo } from "react";
import { countLabel, translateUi } from "../i18n";
import { aggregateHeatmaps } from "../lib/heatmap";
import { translateValue } from "../lib/translate";
import { splitEmojiLabel, tierKey } from "../lib/text";
import {
  PLAY_BG,
  PLAY_DOT,
  PLAY_ORDER,
  STATUS_DOT,
  STATUS_ORDER,
  TIER_BG,
  TIER_FG,
  TIER_ORDER,
  orderWithExtras,
  tierRank,
} from "../lib/taxonomy";
import { useCollection } from "../state/collection";
import type { Filters } from "../types";
import { Cover, TierBadge } from "./bits";
import { ProgressRings } from "./SystemStats";

interface Props {
  onFilter: (filters: Partial<Filters>, toast: string) => void;
  onOpen: (id: string) => void;
  onSystem: (name: string) => void;
}

export function Dashboard({ onFilter, onOpen, onSystem }: Props) {
  const { games, dict, lang, t, source, fresh } = useCollection();
  const locale = lang === "de" ? "de-DE" : "en-US";
  const heat = useMemo(() => aggregateHeatmaps(games), [games]);
  const total = games.length;
  const installed = games.filter((game) => game.status === "Installiert").length;
  const done = games.filter((game) => game.status === "Gespielt" || game.status === "Abgeschlossen").length;
  const sTier = games.filter((game) => tierKey(game.tier) === "S").length;
  const playColumns = orderWithExtras(PLAY_ORDER, heat.flatMap((row) => Object.keys(row.play)));
  const tierColumns = orderWithExtras(TIER_ORDER, heat.flatMap((row) => Object.keys(row.tier)));
  const playMax = Math.max(1, ...heat.flatMap((row) => playColumns.map((column) => row.play[column] ?? 0)));
  const rated = games
    .filter((game) => game.rating != null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || tierRank(a.tier) - tierRank(b.tier) || a.title.localeCompare(b.title, "de"))
    .slice(0, 8);
  const tierCounts = TIER_ORDER.map((key) => [key, games.filter((game) => tierKey(game.tier) === key).length] as const).filter((entry) => entry[1] > 0);
  const tierMax = Math.max(1, ...tierCounts.map((entry) => entry[1]));
  const sourceText = fresh ? t("sourceLive") : source === "live" ? t("sourceCache") : t("sourceSnapshot");

  const jump = (filters: Partial<Filters>, parts: string[]) => {
    const matched = games.filter((game) => {
      if (filters.system?.length && !filters.system.includes(game.system)) return false;
      if (filters.tier?.length && !filters.tier.includes(tierKey(game.tier))) return false;
      if (filters.play?.length && !filters.play.includes(game.playability)) return false;
      if (filters.status?.length && !filters.status.includes(game.status)) return false;
      return true;
    }).length;
    onFilter(filters, `${parts.filter(Boolean).join(" · ")}: ${countLabel(lang, matched)}`);
  };

  const statusItems = STATUS_ORDER.map((status) => ({
    key: status,
    label: translateValue(dict, "Status", status, lang),
    value: games.filter((game) => game.status === status).length,
    color: STATUS_DOT[status] ?? "#999",
  })).filter((item) => item.value);
  const playItems = PLAY_ORDER.map((play) => ({
    key: play,
    label: splitEmojiLabel(translateValue(dict, "Spielbarkeit RG477V", play, lang)).label,
    value: games.filter((game) => game.playability === play).length,
    color: PLAY_DOT[play] ?? "#999",
  })).filter((item) => item.value);

  return (
    <div className="dash" id="dash">
      <h1>{t("dashTitle")}</h1>
      <p className="lead">{translateUi(lang, "dashLead", { n: total.toLocaleString(locale) })}</p>
      <p className="source">{sourceText}</p>
      <ProgressRings games={games} onFilter={(partial) => jump(partial, [])} />
      <section className="chart span sysoverview">
        <h3>{t("systemsOverview")}</h3>
        <div className="syspicks">
          {[...new Set(games.map((game) => game.system))].sort((a, b) => a.localeCompare(b, "de")).map((system) => (
            <button key={system} type="button" onClick={() => onSystem(system)}>{system}</button>
          ))}
        </div>
      </section>
      <div className="kpis">
        <button type="button" className="kpi" onClick={() => jump({}, [t("kTitles")])}>
          <div className="n">{total.toLocaleString(locale)}</div>
          <div className="l">{t("kTitles")}</div>
          <div className="bar"><i style={{ width: "100%" }} /></div>
        </button>
        <button type="button" className="kpi" onClick={() => jump({ status: ["Installiert"] }, [t("kInstalled")])}>
          <div className="n">{installed.toLocaleString(locale)}</div>
          <div className="l">{t("kInstalled")}</div>
          <div className="bar"><i style={{ width: `${total ? (installed / total) * 100 : 0}%` }} /></div>
        </button>
        <button type="button" className="kpi" onClick={() => jump({ status: ["Gespielt", "Abgeschlossen"] }, [t("kProgress")])}>
          <div className="n">{done.toLocaleString(locale)}</div>
          <div className="l">{t("kProgress")}</div>
          <div className="bar"><i style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
        </button>
        <button type="button" className="kpi" onClick={() => jump({ tier: ["S"] }, [t("kS")])}>
          <div className="n">{sTier.toLocaleString(locale)}</div>
          <div className="l">{t("kS")}</div>
          <div className="bar"><i style={{ width: `${total ? (sTier / total) * 100 : 0}%` }} /></div>
        </button>
      </div>
      <div className="charts">
        <section className="chart">
          <h3>{t("cStatus")}</h3>
          <p className="hint">{t("cStatusHint")}</p>
          <Donut items={statusItems} totalLabel={t("titles")} onPick={(key) => jump({ status: [key] }, [translateValue(dict, "Status", key, lang)])} />
        </section>
        <section className="chart">
          <h3>{t("cPlay")}</h3>
          <p className="hint">{t("cPlayHint")}</p>
          <Donut items={playItems} totalLabel={t("titles")} onPick={(key) => jump({ play: [key] }, [splitEmojiLabel(translateValue(dict, "Spielbarkeit RG477V", key, lang)).label])} />
        </section>
        <section className="chart span">
          <h3>{t("cTier")}</h3>
          <p className="hint">{t("cTierHint")}</p>
          <div className="tierbars">
            {tierCounts.map(([key, value]) => (
              <button key={key} type="button" onClick={() => jump({ tier: [key] }, [translateValue(dict, "Tier", key, lang)])}>
                <b>{value}</b>
                <i style={{ height: `${Math.max(8, (value / tierMax) * 86)}px`, background: TIER_BG[key] }} />
                <span>{translateValue(dict, "Tier", key, lang)}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="chart span">
          <h3>{t("topRatings")}</h3>
          {rated.length === 0 ? (
            <p className="hint">{t("topRatingsEmpty")}</p>
          ) : (
            <div className="toplist">
              {rated.map((game) => (
                <button key={game.id} type="button" className="toprow" onClick={() => onOpen(game.id)}>
                  <span className="th"><Cover game={game} /></span>
                  <span className="rt">
                    <b>{game.title}</b>
                    <small>{game.system} · {game.year ?? ""}</small>
                  </span>
                  <TierBadge tier={game.tier} />
                  <strong>{game.rating}</strong>
                </button>
              ))}
            </div>
          )}
        </section>
        <div className="heats">
          <section className="chart">
            <h3>{t("hmPlay")}</h3>
            <p className="hint">{translateUi(lang, "hmHint", { n: total.toLocaleString(locale) })}</p>
            <div className="heatwrap">
              <table className="heat">
                <thead>
                  <tr>
                    <th>{t("hmSys")}</th>
                    {playColumns.map((column) => {
                      const parts = splitEmojiLabel(translateValue(dict, "Spielbarkeit RG477V", column, lang));
                      return (
                        <th key={column}>
                          <button type="button" onClick={() => jump({ play: [column] }, [parts.label])}>
                            <span className="emo">{parts.emoji}</span>
                            <span>{parts.label}</span>
                          </button>
                        </th>
                      );
                    })}
                    <th>Σ</th>
                  </tr>
                </thead>
                <tbody>
                  {heat.map((row) => (
                    <tr key={row.system}>
                      <th>
                        <button type="button" onClick={() => jump({ system: [row.system] }, [row.system])}>{row.system}</button>
                      </th>
                      {playColumns.map((column) => {
                        const value = row.play[column] ?? 0;
                        const mix = Math.round(46 + 54 * Math.sqrt(value / playMax));
                        const parts = splitEmojiLabel(translateValue(dict, "Spielbarkeit RG477V", column, lang));
                        return (
                          <td key={column}>
                            <button
                              type="button"
                              className={value ? "" : "z"}
                              style={value ? { background: `color-mix(in srgb, ${PLAY_BG[column] ?? "#ddd"} ${mix}%, transparent)`, color: "#1b2540" } : undefined}
                              onClick={() => jump({ system: [row.system], play: [column] }, [row.system, parts.label])}
                            >
                              {value || "·"}
                            </button>
                          </td>
                        );
                      })}
                      <td className="tot">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="chart">
            <h3>{t("hmTier")}</h3>
            <p className="hint">{translateUi(lang, "hmHint", { n: total.toLocaleString(locale) })}</p>
            <div className="heatwrap">
              <table className="heat">
                <thead>
                  <tr>
                    <th>{t("hmSys")}</th>
                    {tierColumns.map((column) => (
                      <th key={column}>
                        <button type="button" onClick={() => jump({ tier: [column] }, [translateValue(dict, "Tier", column, lang)])}>
                          <span className="sw" style={{ background: TIER_BG[column] ?? "#ddd" }} />
                          <span>{translateValue(dict, "Tier", column, lang)}</span>
                        </button>
                      </th>
                    ))}
                    <th>Σ</th>
                  </tr>
                </thead>
                <tbody>
                  {heat.map((row) => (
                    <tr key={row.system}>
                      <th>
                        <button type="button" onClick={() => jump({ system: [row.system] }, [row.system])}>{row.system}</button>
                      </th>
                      {tierColumns.map((column) => {
                        const value = row.tier[column] ?? 0;
                        return (
                          <td key={column}>
                            <button
                              type="button"
                              className={value ? "" : "z"}
                              style={value ? { background: TIER_BG[column] ?? "#d5dbe6", color: TIER_FG[column] ?? "#1f2a44" } : undefined}
                              onClick={() => jump({ system: [row.system], tier: [column] }, [row.system, translateValue(dict, "Tier", column, lang)])}
                            >
                              {value || "·"}
                            </button>
                          </td>
                        );
                      })}
                      <td className="tot">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Donut({
  items,
  totalLabel,
  onPick,
}: {
  items: { key: string; label: string; value: number; color: string }[];
  totalLabel: string;
  onPick: (key: string) => void;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let angle = -Math.PI / 2;
  const paths = items.map((item) => {
    const sweep = total ? (item.value / total) * Math.PI * 2 : 0;
    const start = angle;
    const end = angle + Math.max(sweep - 0.0001, 0);
    angle += sweep;
    const arc = (value: number, radius: number) => [90 + radius * Math.cos(value), 90 + radius * Math.sin(value)];
    const [x0, y0] = arc(start, 80);
    const [x1, y1] = arc(end, 80);
    const [x2, y2] = arc(end, 52);
    const [x3, y3] = arc(start, 52);
    const large = end - start > Math.PI ? 1 : 0;
    const single = items.length === 1;
    const d = single
      ? "M90 10 A80 80 0 1 1 89.99 10 L89.99 38 A52 52 0 1 0 90 38 Z"
      : `M${x0} ${y0} A80 80 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A52 52 0 ${large} 0 ${x3} ${y3} Z`;
    return { ...item, d };
  });
  return (
    <div className="donutwrap">
      <svg className="donut" viewBox="0 0 180 180">
        {paths.map((path) => (
          <path key={path.key} d={path.d} fill={path.color} onClick={() => onPick(path.key)}>
            <title>{path.label}: {path.value}</title>
          </path>
        ))}
        <text x="90" y="92" textAnchor="middle" className="ctr">{total}</text>
        <text x="90" y="110" textAnchor="middle" className="ctr2">{totalLabel}</text>
      </svg>
      <div className="legend">
        {items.map((item) => (
          <button key={item.key} type="button" onClick={() => onPick(item.key)}>
            <span className="dot" style={{ background: item.color }} />
            {item.label}
            <b>{item.value}</b>
          </button>
        ))}
      </div>
    </div>
  );
}
