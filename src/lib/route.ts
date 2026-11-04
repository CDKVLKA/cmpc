import type { FilterKey, Filters, SortKey } from "../types";
import { emptyFilters } from "./query";

export type ViewName = "home" | "browse" | "series" | "mixtapes" | "dash" | "system";

export interface RouteState {
  view: ViewName;
  id: string | null;
  q: string;
  sort: SortKey;
  filters: Filters;
}

const FILTER_KEYS: FilterKey[] = ["system", "tier", "play", "status", "genre", "category", "playtime", "series", "tags", "cyber"];
const SORTS = new Set<SortKey>(["title", "year", "tier", "system", "rating", "status"]);

export function parseHash(hash: string): RouteState {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const [pathPart, queryPart] = raw.split("?");
  const path = pathPart || "/";
  const params = new URLSearchParams(queryPart ?? "");
  const filters = emptyFilters();
  for (const key of FILTER_KEYS) {
    const value = params.get(key);
    if (value) filters[key] = value.split("|").map((part) => part.trim()).filter(Boolean);
  }
  const sortParam = params.get("sort");
  const sort = sortParam && SORTS.has(sortParam as SortKey) ? (sortParam as SortKey) : "tier";
  const q = params.get("q") ?? "";
  const tail = (prefix: string) => decodeURIComponent(path.slice(prefix.length));
  if (path.startsWith("/spiel/")) return { view: "browse", id: tail("/spiel/"), q, sort, filters };
  if (path.startsWith("/sammlung")) return { view: "browse", id: null, q, sort, filters };
  if (path.startsWith("/serie/")) return { view: "series", id: tail("/serie/"), q, sort, filters };
  if (path.startsWith("/serien")) return { view: "series", id: null, q, sort, filters };
  if (path.startsWith("/mixtape/")) return { view: "mixtapes", id: tail("/mixtape/"), q, sort, filters };
  if (path.startsWith("/mixtapes")) return { view: "mixtapes", id: null, q, sort, filters };
  if (path.startsWith("/system/")) return { view: "system", id: tail("/system/"), q, sort, filters };
  if (path.startsWith("/dashboard")) return { view: "dash", id: null, q, sort, filters };
  return { view: "home", id: null, q, sort, filters };
}

export function buildHash(state: RouteState): string {
  let path = "#/";
  if (state.view === "browse") path = state.id ? `#/spiel/${encodeURIComponent(state.id)}` : "#/sammlung";
  else if (state.view === "series") path = state.id ? `#/serie/${encodeURIComponent(state.id)}` : "#/serien";
  else if (state.view === "mixtapes") path = state.id ? `#/mixtape/${encodeURIComponent(state.id)}` : "#/mixtapes";
  else if (state.view === "system" && state.id) path = `#/system/${encodeURIComponent(state.id)}`;
  else if (state.view === "dash") path = "#/dashboard";
  const params = new URLSearchParams();
  if (state.view === "browse") {
    if (state.q) params.set("q", state.q);
    if (state.sort !== "tier") params.set("sort", state.sort);
    for (const key of FILTER_KEYS) {
      if (state.filters[key].length) params.set(key, state.filters[key].join("|"));
    }
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
