import { useEffect, useMemo, useRef, useState } from "react";
import { pendingLabel } from "../i18n";
import { createSearchIndex, searchIds } from "../lib/search";
import { applyTextAndFilters, emptyFilters } from "../lib/query";
import { useCollection } from "../state/collection";
import type { FilterKey, Filters, Game, SortKey } from "../types";
import { BrowseView } from "./BrowseView";
import { Dashboard } from "./Dashboard";
import { Detail } from "./Detail";
import { HomeView } from "./HomeView";
import { Lightbox } from "./Lightbox";
import { isTypingTarget, spatialMove, startGamepad } from "./nav";

type View = "home" | "browse" | "dash";

function readRoute(): { view: View; id: string | null } {
  const hash = location.hash || "#/";
  if (hash.startsWith("#/spiel/")) return { view: "browse", id: decodeURIComponent(hash.slice("#/spiel/".length)) };
  if (hash.startsWith("#/dashboard")) return { view: "dash", id: null };
  if (hash.startsWith("#/sammlung")) return { view: "browse", id: null };
  return { view: "home", id: null };
}

function routeHash(view: View, id: string | null): string {
  if (view === "home") return "#/";
  if (view === "dash") return "#/dashboard";
  if (id) return `#/spiel/${encodeURIComponent(id)}`;
  return "#/sammlung";
}

function useWide(): boolean {
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 761px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 761px)");
    const apply = () => setWide(query.matches);
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  return wide;
}

export function Shell() {
  const data = useCollection();
  const wide = useWide();
  const initial = readRoute();
  const [view, setView] = useState<View>(initial.view);
  const [selectedId, setSelectedId] = useState<string | null>(initial.id);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [sort, setSort] = useState<SortKey>("tier");
  const [layout, setLayout] = useState<"list" | "grid">(() => (localStorage.getItem("cmpc-layout") === "grid" ? "grid" : localStorage.getItem("cmpc-layout") === "list" ? "list" : window.innerWidth > 760 ? "list" : "grid"));
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [sysIndex, setSysIndex] = useState(0);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [pad, setPad] = useState(false);
  const moveRef = useRef<(dx: number, dy: number) => boolean>(() => false);
  const stateRef = useRef({ view, selectedId, openFilter, lightboxId, wide, layout, sysIndex });
  stateRef.current = { view, selectedId, openFilter, lightboxId, wide, layout, sysIndex };

  const index = useMemo(() => createSearchIndex(data.games, data.dict), [data.games, data.dict]);
  const scores = useMemo(() => searchIds(index, query), [index, query]);
  const textMatched = useMemo(() => (scores ? data.games.filter((game) => scores.has(game.id)) : data.games), [data.games, scores]);
  const results = useMemo(() => applyTextAndFilters(data.games, scores, filters, sort), [data.games, scores, filters, sort]);
  const selected = data.games.find((game) => game.id === selectedId) ?? null;
  const lightbox = data.games.find((game) => game.id === lightboxId) ?? null;
  const wideList = wide && layout === "list";
  const detailOpen = view === "browse" && Boolean(selected);

  useEffect(() => {
    localStorage.setItem("cmpc-layout", layout);
  }, [layout]);

  useEffect(() => {
    document.body.classList.toggle("listmode", view === "browse" && wideList);
  }, [view, wideList]);

  useEffect(() => {
    const sync = () => {
      const route = readRoute();
      setView(route.view);
      setSelectedId(route.id);
    };
    window.addEventListener("hashchange", sync);
    if (!location.hash) history.replaceState(null, "", "#/");
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function go(nextView: View, id: string | null, mode: "push" | "replace") {
    const next = routeHash(nextView, nextView === "browse" ? id : null);
    setView(nextView);
    setSelectedId(nextView === "browse" ? id : null);
    setLightboxId(null);
    if (location.hash === next) return;
    if (mode === "replace") history.replaceState(null, "", next);
    else location.hash = next;
  }

  const actionsRef = useRef<{
    go: (nextView: View, id: string | null, mode: "push" | "replace") => void;
    applyFilter: (partial: Partial<Filters>, toast?: string) => void;
  }>({
    go: () => undefined,
    applyFilter: () => undefined,
  });

  function applyFilter(partial: Partial<Filters>, toast?: string) {
    const next = emptyFilters();
    (Object.keys(partial) as FilterKey[]).forEach((key) => {
      const value = partial[key];
      if (value?.length) next[key] = value;
    });
    setFilters(next);
    setQuery("");
    setOpenFilter(null);
    setSort("tier");
    go("browse", null, "push");
    if (toast) data.showToast(toast);
  }
  actionsRef.current = { go, applyFilter };

  useEffect(() => {
    if (view !== "browse" || !wideList || !results.length) return;
    if (selectedId && results.some((game) => game.id === selectedId)) return;
    const first = results[0];
    if (first) actionsRef.current.go("browse", first.id, "replace");
  }, [view, wideList, results, selectedId]);

  function openGame(id: string) {
    setFilters(emptyFilters());
    setQuery("");
    setOpenFilter(null);
    go("browse", id, "push");
  }

  useEffect(() => {
    const systems = new Map<string, number>();
    for (const game of data.games) systems.set(game.system, (systems.get(game.system) ?? 0) + 1);
    const ordered = [...systems.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de")).map((entry) => entry[0]);
    const onKey = (event: KeyboardEvent) => {
      const current = stateRef.current;
      if (current.lightboxId) {
        if (event.key === "Escape" || event.key === "Backspace" || event.key === "b" || event.key === "B") {
          event.preventDefault();
          setLightboxId(null);
        }
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab", "Enter"].includes(event.key)) document.body.classList.add("kbd");
      const typing = isTypingTarget(event.target);
      if (event.key === "Escape" || (event.key === "Backspace" && !typing)) {
        event.preventDefault();
        if (current.openFilter) {
          setOpenFilter(null);
          return;
        }
        const inDetail = document.activeElement instanceof HTMLElement && document.activeElement.closest("#detail");
        if (inDetail && current.wide && current.layout === "list") {
          document.querySelector<HTMLElement>(`#grid [data-id="${CSS.escape(current.selectedId ?? "")}"]`)?.focus();
          return;
        }
        if (current.selectedId && current.view === "browse" && !(current.wide && current.layout === "list")) {
          actionsRef.current.go("browse", null, "push");
          return;
        }
        if (current.view !== "home") {
          actionsRef.current.go("home", null, "push");
          return;
        }
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        return;
      }
      if (!typing && (event.key === "PageUp" || event.key === "PageDown" || event.key === "q" || event.key === "e")) {
        event.preventDefault();
        const direction = event.key === "PageUp" || event.key === "q" ? -1 : 1;
        if (current.view === "home") setSysIndex((index) => index + direction);
        else if (ordered.length) {
          const active = filters.system.length === 1 ? ordered.indexOf(filters.system[0] ?? "") : -1;
          const next = ordered[(active + direction + ordered.length) % ordered.length];
          if (next) actionsRef.current.applyFilter({ system: [next] });
        }
        return;
      }
      if (!typing && (event.key === "y" || event.key === "Y" || event.key === "/")) {
        event.preventDefault();
        if (current.view !== "browse") actionsRef.current.go("browse", null, "push");
        requestAnimationFrame(() => document.getElementById("q")?.focus());
        return;
      }
      const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const direction = arrows[event.key];
      if (!direction) return;
      if (event.target instanceof HTMLTextAreaElement) {
        const area = event.target;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") return;
        if (event.key === "ArrowUp" && (area.selectionStart ?? 0) > 0) return;
        if (event.key === "ArrowDown" && (area.selectionEnd ?? 0) < area.value.length) return;
      }
      if (event.target instanceof HTMLInputElement && (event.key === "ArrowLeft" || event.key === "ArrowRight")) return;
      if (event.target instanceof HTMLSelectElement) return;
      event.preventDefault();
      if (moveRef.current(direction[0], direction[1])) return;
      spatialMove(direction[0], direction[1]);
    };
    const onPointer = () => document.body.classList.remove("kbd");
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    const stopPad = startGamepad(setPad);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      stopPad();
    };
    // Filters are read for L1/R1. The listener is rebuilt when they change.
  }, [data.games, filters.system]);

  if (!data.ready) {
    return (
      <div className="boot">
        <div className="cmpc">CMPC</div>
        <p>{data.t("loading")}</p>
      </div>
    );
  }
  if (data.loadError) {
    return (
      <div className="boot">
        <div className="cmpc">CMPC</div>
        <p>{data.t("loadError")}</p>
      </div>
    );
  }

  return (
    <div className="app" id="app">
      <header className="top">
        <div className="brand">
          <div className="cmpc">CMPC</div>
          <div className="ttl">
            Chris' Mega Pint Collection
            <small>{data.t("subtitle")}</small>
          </div>
        </div>
        <nav className="tabs" aria-label="CMPC">
          <button type="button" className={view === "home" ? "on" : ""} onClick={() => go("home", null, "push")}>
            <IconHome />
            <span>{data.t("tabHome")}</span>
          </button>
          <button type="button" className={view === "browse" ? "on" : ""} onClick={() => go("browse", wideList ? results[0]?.id ?? null : null, "push")}>
            <IconGrid />
            <span>{data.t("tabCollection")}</span>
          </button>
          <button type="button" className={view === "dash" ? "on" : ""} onClick={() => go("dash", null, "push")}>
            <IconDash />
            <span>{data.t("tabDashboard")}</span>
          </button>
        </nav>
        <div className="spacer" />
        {data.pending.length > 0 ? (
          <button type="button" className="draft" onClick={() => data.syncNow()}>
            {data.syncing ? data.t("syncing") : pendingLabel(data.lang, data.pending.length)}
          </button>
        ) : data.signedIn ? (
          <button type="button" className="signed" onClick={data.signOut}>{data.t("signedIn")}</button>
        ) : data.authConfigured ? (
          <button type="button" className="signin" onClick={data.signIn}>{data.t("signIn")}</button>
        ) : (
          <span className="readonly" title={data.t("authMissing")}>{data.t("readOnlyBadge")}</span>
        )}
        <div className="seg" role="group" aria-label="Language">
          <button type="button" className={data.lang === "de" ? "on" : ""} onClick={() => data.setLang("de")}>DE</button>
          <button type="button" className={data.lang === "en" ? "on" : ""} onClick={() => data.setLang("en")}>EN</button>
        </div>
        <button type="button" className="iconbtn" aria-label={data.theme === "dark" ? data.t("themeToLight") : data.t("themeToDark")} onClick={data.toggleTheme}>
          {data.theme === "dark" ? <IconMoon /> : <IconSun />}
        </button>
      </header>
      <main>
        {view === "home" ? (
          <section className="view on">
            <HomeView
              sysIndex={sysIndex}
              onIndex={setSysIndex}
              onEnter={(system) => applyFilter({ system: [system] })}
              onOpen={openGame}
              onRail={applyFilter}
            />
          </section>
        ) : null}
        {view === "browse" ? (
          <section className="view on browse-view">
            <BrowseView
              results={results}
              textMatched={textMatched}
              filters={filters}
              setFilters={setFilters}
              query={query}
              setQuery={setQuery}
              sort={sort}
              setSort={setSort}
              layout={layout}
              setLayout={setLayout}
              openFilter={openFilter}
              setOpenFilter={setOpenFilter}
              selectedId={selectedId}
              onSelect={(id) => go("browse", id, wideList ? "replace" : "push")}
              wide={wide}
              moveRef={moveRef}
            />
            <div className={`scrim${detailOpen && !wide ? " on" : ""}`} onClick={() => go("browse", null, "push")} />
            <Detail game={detailOpen ? selected : null} wideList={wideList} onClose={() => go("browse", null, "push")} onCover={(game: Game) => setLightboxId(game.id)} />
          </section>
        ) : null}
        {view === "dash" ? (
          <section className="view on">
            <Dashboard onFilter={applyFilter} onOpen={openGame} />
          </section>
        ) : null}
      </main>
      <footer className="helpbar">
        <span className="pad">
          <i style={{ background: pad ? "#5DBB7A" : "var(--faint)" }} />
          {pad ? data.t("hPad") : data.t("hKeys")}
        </span>
        <span><span className="k">✥</span>{data.t("hNav")}</span>
        <span><span className="k">A</span>{data.t("hOpen")}</span>
        <span><span className="k">B</span>{data.t("hBack")}</span>
        <span><span className="k">L1 R1</span>{data.t("hSys")}</span>
        <span><span className="k">Y</span>{data.t("hSearch")}</span>
      </footer>
      {data.toast ? <div className="toast on" role="status">{data.toast}</div> : <div className="toast" />}
      {data.conflict ? (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
          <div className="modalcard">
            <h2 id="conflict-title">{data.t("conflictTitle")}</h2>
            <p>{data.t("conflictBody")}</p>
            <div className="conflictvals">
              <div>
                <span>{data.t("conflictSheet")}</span>
                <b>{data.conflict.sheetValue || data.t("emptyValue")}</b>
              </div>
              <div>
                <span>{data.t("conflictApp")}</span>
                <b>{data.conflict.edit.value || data.t("emptyValue")}</b>
              </div>
            </div>
            <div className="modalactions">
              <button type="button" onClick={() => data.resolveConflict("sheet")}>{data.t("keepSheet")}</button>
              <button type="button" className="primary" onClick={() => data.resolveConflict("app")}>{data.t("keepApp")}</button>
            </div>
          </div>
        </div>
      ) : null}
      <Lightbox game={lightbox} onClose={() => setLightboxId(null)} />
    </div>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="2" y="7" width="20" height="12" rx="4" />
      <path d="M7 11v4M5 13h4" />
      <circle cx="16" cy="12" r="1" fill="currentColor" />
      <circle cx="18" cy="14.5" r="1" fill="currentColor" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="9" rx="1.5" />
      <rect x="3" y="15" width="7" height="6" rx="1.5" />
      <rect x="14" y="15" width="7" height="6" rx="1.5" />
    </svg>
  );
}

function IconDash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 9 9h-9z" />
      <path d="M15 3.5A9 9 0 0 1 20.5 9H15z" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
