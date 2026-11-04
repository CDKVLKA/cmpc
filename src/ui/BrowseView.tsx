import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { countLabel } from "../i18n";
import { translateValue } from "../lib/translate";
import { splitEmojiLabel, tierKey } from "../lib/text";
import { matchesFilters } from "../lib/query";
import {
  CATEGORY_ORDER,
  CYBER_ORDER,
  PLAY_DOT,
  PLAY_ORDER,
  PLAYTIME_ORDER,
  STATUS_DOT,
  STATUS_ORDER,
  TIER_ORDER,
  orderWithExtras,
} from "../lib/taxonomy";
import { useCollection } from "../state/collection";
import type { FilterKey, Filters, Game, SortKey } from "../types";
import { useMixtapes } from "../state/mixtapes";
import { Cover, Dot, RatingBadge, TierBadge } from "./bits";

interface Props {
  results: Game[];
  textMatched: Game[];
  filters: Filters;
  setFilters: (filters: Filters) => void;
  query: string;
  setQuery: (value: string) => void;
  sort: SortKey;
  setSort: (sort: SortKey) => void;
  layout: "list" | "grid";
  setLayout: (layout: "list" | "grid") => void;
  openFilter: FilterKey | null;
  setOpenFilter: (key: FilterKey | null) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  wide: boolean;
  moveRef: MutableRefObject<(dx: number, dy: number) => boolean>;
}

const FACETS: { key: FilterKey; label: "fSystem" | "fTier" | "fPlay" | "fStatus" | "fGenre" | "fCategory" | "fTime" | "fSeries" | "fTags" | "fCyber"; area: string }[] = [
  { key: "system", label: "fSystem", area: "System" },
  { key: "tier", label: "fTier", area: "Tier" },
  { key: "play", label: "fPlay", area: "Spielbarkeit RG477V" },
  { key: "status", label: "fStatus", area: "Status" },
  { key: "genre", label: "fGenre", area: "Genre" },
  { key: "category", label: "fCategory", area: "Kategorie" },
  { key: "playtime", label: "fTime", area: "Spielzeit" },
  { key: "series", label: "fSeries", area: "Serie" },
  { key: "tags", label: "fTags", area: "Tags" },
  { key: "cyber", label: "fCyber", area: "Cyberpunk-Bezug" },
];

function valuesOf(game: Game, key: FilterKey): string[] {
  switch (key) {
    case "system":
      return game.system ? [game.system] : [];
    case "tier":
      return [tierKey(game.tier)];
    case "play":
      return game.playability ? [game.playability] : [];
    case "status":
      return game.status ? [game.status] : [];
    case "genre":
      return game.genre ? [game.genre] : [];
    case "category":
      return game.category ? [game.category] : [];
    case "playtime":
      return [game.playtimeBucket];
    case "series":
      return game.series ? [game.series] : [];
    case "tags":
      return game.tags;
    case "cyber":
      return game.cyberpunk ? [game.cyberpunk] : [];
    default:
      return [];
  }
}

export function BrowseView(props: Props) {
  const { results, textMatched, filters, setFilters, query, setQuery, sort, setSort, layout, setLayout, openFilter, setOpenFilter, selectedId, onSelect, wide, moveRef } = props;
  const { t, lang, dict, signedIn } = useCollection();
  const mixes = useMixtapes();
  const parentRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(layout === "list" ? 1 : 2);
  const [facetQuery, setFacetQuery] = useState("");
  const list = layout === "list";

  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;
    const update = () => {
      if (list) {
        setCols(1);
        return;
      }
      const width = element.clientWidth - 28;
      if (width < 520) {
        setCols(2);
        return;
      }
      setCols(Math.max(2, Math.floor((width + 18) / 176)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [list]);

  const rowCount = list ? results.length : Math.max(1, Math.ceil(results.length / cols));
  const virtualizer = useVirtualizer({
    count: results.length ? rowCount : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (list ? 64 : 292),
    overscan: 4,
    measureElement: (element) => element.getBoundingClientRect().height,
  });

  useEffect(() => {
    if (!selectedId) return;
    const index = results.findIndex((game) => game.id === selectedId);
    if (index < 0) return;
    if (document.querySelector(`#grid [data-id="${CSS.escape(selectedId)}"]`)) return;
    virtualizer.scrollToIndex(list ? index : Math.floor(index / cols), { align: "center" });
  }, [selectedId, results, cols, list, virtualizer]);

  moveRef.current = (dx, dy) => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !active.dataset.id || !active.closest("#grid")) return false;
    const index = results.findIndex((game) => game.id === active.dataset.id);
    if (index < 0) return false;
    if (list && dx === 1 && dy === 0) {
      document.querySelector<HTMLElement>("#detail button:not(:disabled), #detail a[href], #detail textarea")?.focus();
      return true;
    }
    if (list && dx !== 0) return true;
    const next = list ? index + dy : index + dx + dy * cols;
    if (next < 0 || next >= results.length) return true;
    const id = results[next]?.id;
    if (!id) return true;
    virtualizer.scrollToIndex(list ? next : Math.floor(next / cols), { align: "auto" });
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`#grid [data-id="${CSS.escape(id)}"]`)?.focus());
    if (list && wide) onSelect(id);
    return true;
  };

  const facet = FACETS.find((item) => item.key === openFilter) ?? null;
  const options = useMemo(() => {
    if (!facet) return [];
    const counts = new Map<string, number>();
    const narrowed = { ...filters, [facet.key]: [] };
    for (const game of textMatched) {
      if (!matchesFilters(game, narrowed)) continue;
      for (const value of valuesOf(game, facet.key)) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const preferred =
      facet.key === "status" ? STATUS_ORDER : facet.key === "play" ? PLAY_ORDER : facet.key === "tier" ? TIER_ORDER : facet.key === "playtime" ? PLAYTIME_ORDER : facet.key === "cyber" ? CYBER_ORDER : facet.key === "category" ? CATEGORY_ORDER : [];
    const ordered = preferred.length ? orderWithExtras(preferred, counts.keys()) : [...counts.keys()].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b, "de"));
    const needle = facetQuery.trim().toLocaleLowerCase(lang === "de" ? "de" : "en");
    return ordered
      .filter((value) => !needle || translateValue(dict, facet.area, value, lang).toLocaleLowerCase(lang === "de" ? "de" : "en").includes(needle))
      .map((value) => ({ value, count: counts.get(value) ?? 0 }));
  }, [facet, filters, textMatched, facetQuery, dict, lang]);

  const active = Object.values(filters).some((list) => list.length > 0) || Boolean(query);
  const toggle = (key: FilterKey, value: string) => {
    const current = filters[key];
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    setFilters({ ...filters, [key]: next });
  };

  const rows = virtualizer.getVirtualItems();
  return (
    <div className="browse">
      <div className="toolbar">
        <div className={`search${query ? " has" : ""}`}>
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input id="q" name="q" type="search" value={query} placeholder={t("search")} autoComplete="off" spellCheck={false} onChange={(event) => setQuery(event.target.value)} />
          <button type="button" className="clear" aria-label={t("clearSearch")} onClick={() => setQuery("")}>✕</button>
        </div>
        <div className="chips">
          {active ? (
            <button type="button" className="chip reset" onClick={() => { setFilters({ system: [], tier: [], play: [], status: [], genre: [], category: [], playtime: [], series: [], tags: [], cyber: [] }); setQuery(""); setOpenFilter(null); }}>
              ✕ {t("reset")}
            </button>
          ) : null}
          {FACETS.map((item) => {
            const count = filters[item.key].length;
            return (
              <button key={item.key} type="button" className={`chip${count ? " on" : ""}${openFilter === item.key ? " open" : ""}`} onClick={() => { setFacetQuery(""); setOpenFilter(openFilter === item.key ? null : item.key); }}>
                {t(item.label)}
                {count ? <span className="cnt">{count}</span> : null}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
              </button>
            );
          })}
        </div>
        {facet ? (
          <div className="fpanel on">
            <h4>{t(facet.label)}</h4>
            {options.length > 14 || facetQuery ? (
              <input id="facetq" name="facetq" className="facetq" value={facetQuery} placeholder={t("filterSearch")} onChange={(event) => setFacetQuery(event.target.value)} />
            ) : null}
            <div className="opts">
              {options.map((option) => {
                const on = filters[facet.key].includes(option.value);
                const label = facet.key === "play" ? splitEmojiLabel(translateValue(dict, facet.area, option.value, lang)).label : translateValue(dict, facet.area, option.value, lang);
                const dot = facet.key === "status" ? STATUS_DOT[option.value] : facet.key === "play" ? PLAY_DOT[option.value] : undefined;
                return (
                  <button key={option.value} type="button" className={`opt${on ? " on" : ""}`} onClick={() => toggle(facet.key, option.value)}>
                    {dot ? <Dot color={dot} /> : null}
                    {facet.key === "play" ? <span className="emo">{splitEmojiLabel(option.value).emoji}</span> : null}
                    {label}
                    <small>{option.count}</small>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="meta">
          <span>{countLabel(lang, results.length)}</span>
          <span className="meta-tools">
            <span className="lay">
              <button type="button" className={layout === "list" ? "on" : ""} aria-label="Liste" onClick={() => setLayout("list")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <button type="button" className={layout === "grid" ? "on" : ""} aria-label="Grid" onClick={() => setLayout("grid")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>
              </button>
            </span>
            <span className="quick">
              <button type="button" className={filters.status.length === 1 && filters.status[0] === "Offen" ? "on" : ""} onClick={() => setFilters({ ...filters, status: filters.status.length === 1 && filters.status[0] === "Offen" ? [] : ["Offen"] })}>{t("quickOpen")}</button>
              <button type="button" className={filters.status.length === 1 && filters.status[0] === "Installiert" ? "on" : ""} onClick={() => setFilters({ ...filters, status: filters.status.length === 1 && filters.status[0] === "Installiert" ? [] : ["Installiert"] })}>{t("quickInstalled")}</button>
            </span>
            <label>
              <span>{t("sort")}</span>
              <select id="sort" name="sort" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
                <option value="tier">{t("sortTier")}</option>
                <option value="title">{t("sortTitle")}</option>
                <option value="year">{t("sortYear")}</option>
                <option value="system">{t("sortSystem")}</option>
                <option value="rating">{t("sortRating")}</option>
                <option value="status">{t("sortStatus")}</option>
              </select>
            </label>
          </span>
        </div>
      </div>
      <div className={`gridwrap${list ? " list" : ""}`} id="grid" ref={parentRef}>
        {results.length === 0 ? <div className="empty">{t("empty")}</div> : (
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {rows.map((virtualRow) => {
              const games = list ? results.slice(virtualRow.index, virtualRow.index + 1) : results.slice(virtualRow.index * cols, virtualRow.index * cols + cols);
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className={list ? "vrow" : "vgrid"}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualRow.start}px)`, gridTemplateColumns: list ? undefined : `repeat(${cols}, minmax(0, 1fr))` }}
                >
                  {games.map((game) => list ? (
                    <div key={game.id} className={`row${selectedId === game.id ? " sel" : ""}`}>
                      <button type="button" className="rowmain" data-id={game.id} onClick={() => onSelect(game.id)} onFocus={() => { if (wide) onSelect(game.id); }}>
                        <span className="th"><Cover game={game} /></span>
                        <span className="rt"><b>{game.title}</b><small>{game.system} · {game.year ?? ""} · {game.genre}</small></span>
                        <span className="rd">
                          <TierBadge tier={game.tier} />
                          <RatingBadge rating={game.rating} />
                          <Dot color={STATUS_DOT[game.status] ?? "#999"} title={translateValue(dict, "Status", game.status, lang)} />
                          <Dot color={PLAY_DOT[game.playability] ?? "#999"} title={translateValue(dict, "Spielbarkeit RG477V", game.playability, lang)} />
                        </span>
                      </button>
                      <button type="button" className={`heart${mixes.isFavorite(game.id) ? " on" : ""}`} aria-pressed={mixes.isFavorite(game.id)} aria-label={mixes.isFavorite(game.id) ? t("favoriteRemove") : t("favoriteAdd")} disabled={!signedIn} onClick={() => mixes.toggleFavorite(game)}>♥</button>
                    </div>
                  ) : (
                    <button key={game.id} type="button" className={`tile${selectedId === game.id ? " sel" : ""}`} data-id={game.id} onClick={() => onSelect(game.id)}>
                      <div className="cv">
                        <Cover game={game} />
                        <span className="tier"><TierBadge tier={game.tier} /></span>
                        <span className="dots">
                          <Dot color={STATUS_DOT[game.status] ?? "#999"} title={translateValue(dict, "Status", game.status, lang)} />
                          <Dot color={PLAY_DOT[game.playability] ?? "#999"} title={translateValue(dict, "Spielbarkeit RG477V", game.playability, lang)} />
                        </span>
                      </div>
                      <div className="t">{game.title}</div>
                      <div className="s">{game.system} · {game.year ?? ""}</div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
