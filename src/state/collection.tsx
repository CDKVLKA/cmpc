import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { clientId, requestToken, revokeToken } from "../auth/google";
import { WRITABLE, type WritableField } from "../config";
import { readEdits, readLibrary, writeEdits, writeLibrary, type LibraryRecord } from "../db";
import { translateUi, type StringKey } from "../i18n";
import { decideSync } from "../lib/conflict";
import { parseGames, parseTranslations, stripPrivate } from "../lib/parse";
import { fieldString, withField } from "../lib/query";
import { normalizeCell } from "../lib/text";
import { readRecent, touchRecent } from "../lib/recent";
import { SheetsError, loadLive, locateCell, writeCell } from "../sheets/api";
import type { Dictionary, Game, Lang, PendingEdit, Snapshot } from "../types";

interface ConflictPrompt {
  edit: PendingEdit;
  sheetValue: string;
}

interface CollectionValue {
  ready: boolean;
  loadError: boolean;
  games: Game[];
  dict: Dictionary;
  lang: Lang;
  setLang: (lang: Lang) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
  source: "snapshot" | "live";
  fresh: boolean;
  authConfigured: boolean;
  signedIn: boolean;
  accessToken: string | null;
  recent: Record<string, number>;
  syncing: boolean;
  online: boolean;
  pending: PendingEdit[];
  signIn: () => void;
  signOut: () => void;
  syncNow: () => void;
  updateField: (gameId: string, field: WritableField, value: string | number | null) => void;
  markRecent: (gameId: string) => void;
  conflict: ConflictPrompt | null;
  resolveConflict: (choice: "sheet" | "app") => void;
  toast: string | null;
  showToast: (text: string) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

const CollectionContext = createContext<CollectionValue | null>(null);

function applyPending(games: Game[], edits: PendingEdit[]): Game[] {
  if (!edits.length) return games;
  const grouped = new Map<string, PendingEdit[]>();
  for (const edit of edits) {
    const list = grouped.get(edit.gameId) ?? [];
    list.push(edit);
    grouped.set(edit.gameId, list);
  }
  return games.map((game) => {
    const mine = grouped.get(game.id);
    if (!mine) return game;
    return mine.reduce((current, edit) => withField(current, edit.field, edit.value), game);
  });
}

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [baseGames, setBaseGames] = useState<Game[]>([]);
  const [dict, setDict] = useState<Dictionary>({});
  const [headers, setHeaders] = useState<string[]>([]);
  const [rowById, setRowById] = useState<Record<string, number>>({});
  const [generatedAt, setGeneratedAt] = useState("");
  const [source, setSource] = useState<"snapshot" | "live">("snapshot");
  const [fresh, setFresh] = useState(false);
  const [pending, setPending] = useState<PendingEdit[]>([]);
  const [ready, setReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem("cmpc-lang") === "en" ? "en" : "de"));
  const [theme, setTheme] = useState<"dark" | "light">(() => (localStorage.getItem("cmpc-theme") === "light" ? "light" : "dark"));
  const [token, setToken] = useState<string | null>(null);
  const [recent, setRecent] = useState<Record<string, number>>(() => readRecent());
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [conflict, setConflict] = useState<ConflictPrompt | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const tokenRef = useRef<string | null>(null);
  const pendingRef = useRef<PendingEdit[]>([]);
  const baseRef = useRef<Game[]>([]);
  const rowRef = useRef<Record<string, number>>({});
  const syncingRef = useRef(false);
  const toastTimer = useRef(0);
  const showToastRef = useRef<(text: string) => void>(() => undefined);
  const dictRef = useRef<Dictionary>({});
  const headersRef = useRef<string[]>([]);
  const sourceRef = useRef<"snapshot" | "live">("snapshot");
  const generatedRef = useRef("");

  tokenRef.current = token;
  pendingRef.current = pending;
  baseRef.current = baseGames;
  rowRef.current = rowById;
  dictRef.current = dict;
  headersRef.current = headers;
  sourceRef.current = source;
  generatedRef.current = generatedAt;

  const showToast = useCallback((text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3600);
  }, []);
  showToastRef.current = showToast;

  const t = useCallback(
    (key: StringKey, vars?: Record<string, string | number>) => translateUi(lang, key, vars),
    [lang],
  );

  const persistLibrary = useCallback(async (record: LibraryRecord) => {
    try {
      await writeLibrary(record);
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}snapshot.json`);
        if (!response.ok) throw new Error("snapshot");
        const snap = (await response.json()) as Snapshot;
        let games = snap.games.map(stripPrivate);
        let translations = snap.translations;
        let nextSource: "snapshot" | "live" = "snapshot";
        let nextGenerated = snap.generatedAt;
        let nextRows: Record<string, number> = {};
        let nextHeaders = snap.headers;
        let edits: PendingEdit[] = [];
        try {
          const cached = await readLibrary();
          edits = await readEdits();
          if (cached?.source === "live" && cached.games.length) {
            games = cached.games;
            translations = cached.translations;
            nextSource = "live";
            nextGenerated = cached.generatedAt;
            nextRows = cached.rowById ?? {};
            nextHeaders = cached.headers;
          } else if (!cached || cached.generatedAt !== snap.generatedAt) {
            await writeLibrary({
              source: "snapshot",
              generatedAt: snap.generatedAt,
              fetchedAt: new Date().toISOString(),
              games,
              translations,
              headers: nextHeaders,
              rowById: {},
            });
          }
        } catch {
          /* IndexedDB missing: snapshot in memory is enough */
        }
        if (cancel) return;
        setBaseGames(games);
        setDict(translations);
        setSource(nextSource);
        setGeneratedAt(nextGenerated);
        setRowById(nextRows);
        setHeaders(nextHeaders);
        setPending(edits);
        setHydrated(true);
        setReady(true);
      } catch {
        if (!cancel) {
          setLoadError(true);
          setReady(true);
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeEdits(pending).catch(() => undefined);
  }, [pending, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const handle = window.setTimeout(() => {
      void persistLibrary({
        source: sourceRef.current,
        generatedAt: generatedRef.current || new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        games: baseRef.current,
        translations: dictRef.current,
        headers: headersRef.current,
        rowById: rowRef.current,
      });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [hydrated, baseGames, dict, rowById, source, generatedAt, headers, persistLibrary]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("cmpc-lang", lang);
    localStorage.setItem("cmpc-theme", theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#151d31" : "#eef2f8");
  }, [lang, theme]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const rememberToken = useCallback((access: string, expiresIn: number) => {
    setToken(access);
    window.setTimeout(() => {
      setToken((current) => (current === access ? null : current));
    }, Math.max(30, expiresIn - 60) * 1000);
  }, []);

  const refreshLive = useCallback(
    async (access: string) => {
      try {
        const { list, translations } = await loadLive(access);
        const parsed = parseGames(list);
        const nextDict = parseTranslations(translations);
        const record: LibraryRecord = {
          source: "live",
          generatedAt: new Date().toISOString(),
          fetchedAt: new Date().toISOString(),
          games: parsed.games,
          translations: nextDict,
          headers: parsed.headers,
          rowById: parsed.rowById,
        };
        setBaseGames(parsed.games);
        setDict(nextDict);
        setHeaders(parsed.headers);
        setRowById(parsed.rowById);
        setSource("live");
        setFresh(true);
        setGeneratedAt(record.generatedAt);
        await persistLibrary(record);
      } catch (error) {
        if (error instanceof SheetsError && (error.status === 401 || error.status === 403)) {
          setToken(null);
          sessionStorage.removeItem("cmpc-auth");
          showToast(t(error.status === 403 ? "sheetForbidden" : "signIn"));
        } else {
          showToast(t("sheetError"));
        }
      }
    },
    [persistLibrary, showToast, t],
  );

  const syncNow = useCallback(async () => {
    const access = tokenRef.current;
    if (!access || syncingRef.current || conflict) return;
    if (!navigator.onLine) return;
    const queue = [...pendingRef.current];
    if (!queue.length) return;
    syncingRef.current = true;
    setSyncing(true);
    let remaining = queue;
    try {
      for (const edit of queue) {
        const located = await locateCell(access, edit.gameId, WRITABLE[edit.field], rowRef.current[edit.gameId] ?? null);
        setRowById((prev) => ({ ...prev, [edit.gameId]: located.row }));
        const decision = decideSync(edit.baseValue, located.current, edit.value);
        if (decision.type === "conflict") {
          setConflict({ edit, sheetValue: decision.sheetValue });
          break;
        }
        if (decision.type === "write") {
          const payload = edit.field === "rating" && edit.value ? Number(edit.value) : edit.value;
          await writeCell(access, located.range, payload);
        }
        const stored = normalizeCell(decision.type === "noop" ? located.current : edit.value);
        setBaseGames((prev) => prev.map((game) => (game.id === edit.gameId ? withField(game, edit.field, stored) : game)));
        remaining = remaining.filter((item) => item.key !== edit.key);
      }
      if (remaining.length !== pendingRef.current.length) setPending(remaining);
      if (!remaining.length) showToast(t("saved"));
    } catch (error) {
      if (error instanceof SheetsError && error.status === 401) {
        setToken(null);
        showToast(t("signIn"));
      } else if (!navigator.onLine) {
        showToast(t("offlineSaved"));
      } else {
        showToast(t("sheetError"));
      }
      if (remaining.length !== pendingRef.current.length) setPending(remaining);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [conflict, showToast, t]);

  useEffect(() => {
    if (!hydrated || !token || !pending.length || conflict || !online) return;
    const handle = window.setTimeout(() => void syncNow(), 650);
    return () => window.clearTimeout(handle);
  }, [hydrated, token, pending, conflict, online, syncNow]);

  const signIn = useCallback(() => {
    void requestToken("consent")
      .then(async ({ token: access, expiresIn }) => {
        rememberToken(access, expiresIn);
        sessionStorage.setItem("cmpc-auth", "1");
        await refreshLive(access);
      })
      .catch(() => showToast(t("sheetError")));
  }, [refreshLive, rememberToken, showToast, t]);

  const signOut = useCallback(() => {
    if (tokenRef.current) revokeToken(tokenRef.current);
    setToken(null);
    sessionStorage.removeItem("cmpc-auth");
  }, []);

  useEffect(() => {
    if (!hydrated || !clientId() || sessionStorage.getItem("cmpc-auth") !== "1") return;
    let cancel = false;
    void requestToken("")
      .then(async ({ token: access, expiresIn }) => {
        if (cancel) return;
        rememberToken(access, expiresIn);
        await refreshLive(access);
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [hydrated, refreshLive, rememberToken]);

  const markRecent = useCallback((gameId: string) => setRecent(touchRecent(gameId)), []);

  const updateField = useCallback((gameId: string, field: WritableField, value: string | number | null) => {
    if (!tokenRef.current) return;
    setRecent(touchRecent(gameId));
    const normalized = normalizeCell(value);
    setPending((prev) => {
      const existing = prev.find((edit) => edit.gameId === gameId && edit.field === field);
      const baseGame = baseRef.current.find((game) => game.id === gameId);
      const baseValue = existing?.baseValue ?? (baseGame ? normalizeCell(fieldString(baseGame, field)) : "");
      const without = prev.filter((edit) => !(edit.gameId === gameId && edit.field === field));
      if (baseValue === normalized) return without;
      if (!navigator.onLine) showToastRef.current(translateUi(localStorage.getItem("cmpc-lang") === "en" ? "en" : "de", "offlineSaved"));
      return [
        ...without,
        { key: `${gameId}:${field}`, gameId, field, value: normalized, baseValue, updatedAt: Date.now() },
      ];
    });
  }, []);

  const resolveConflict = useCallback(
    (choice: "sheet" | "app") => {
      const current = conflict;
      if (!current) return;
      setConflict(null);
      if (choice === "sheet") {
        setBaseGames((prev) =>
          prev.map((game) => (game.id === current.edit.gameId ? withField(game, current.edit.field, current.sheetValue) : game)),
        );
        setPending((prev) => prev.filter((edit) => edit.key !== current.edit.key));
        return;
      }
      const access = tokenRef.current;
      if (!access) return;
      void (async () => {
        try {
          const located = await locateCell(
            access,
            current.edit.gameId,
            WRITABLE[current.edit.field],
            rowRef.current[current.edit.gameId] ?? null,
          );
          const payload = current.edit.field === "rating" && current.edit.value ? Number(current.edit.value) : current.edit.value;
          await writeCell(access, located.range, payload);
          setBaseGames((prev) =>
            prev.map((game) => (game.id === current.edit.gameId ? withField(game, current.edit.field, current.edit.value) : game)),
          );
          setPending((prev) => prev.filter((edit) => edit.key !== current.edit.key));
          showToast(t("saved"));
        } catch {
          showToast(t("sheetError"));
          setConflict(current);
        }
      })();
    },
    [conflict, showToast, t],
  );

  const setLang = useCallback((next: Lang) => setLangState(next), []);
  const toggleTheme = useCallback(() => setTheme((value) => (value === "dark" ? "light" : "dark")), []);

  const games = useMemo(() => applyPending(baseGames, pending), [baseGames, pending]);

  const value = useMemo<CollectionValue>(
    () => ({
      ready,
      loadError,
      games,
      dict,
      lang,
      setLang,
      theme,
      toggleTheme,
      source,
      fresh,
      authConfigured: Boolean(clientId()),
      signedIn: Boolean(token),
      accessToken: token,
      recent,
      syncing,
      online,
      pending,
      signIn,
      signOut,
      syncNow,
      updateField,
      markRecent,
      conflict,
      resolveConflict,
      toast,
      showToast,
      t,
    }),
    [
      ready,
      loadError,
      games,
      dict,
      lang,
      setLang,
      theme,
      toggleTheme,
      source,
      fresh,
      token,
      recent,
      syncing,
      online,
      pending,
      signIn,
      signOut,
      syncNow,
      updateField,
      markRecent,
      conflict,
      resolveConflict,
      toast,
      showToast,
      t,
    ],
  );

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

export function useCollection(): CollectionValue {
  const value = useContext(CollectionContext);
  if (!value) throw new Error("useCollection outside provider");
  return value;
}
