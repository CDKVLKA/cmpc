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
import {
  ACCOUNT_SCOPE,
  authFailureKind,
  clientId,
  requestRememberedToken,
  requestToken,
  revokeToken,
  SILENT_TOKEN_TIMEOUT_MS,
  type SessionToken,
  type TokenPrompt,
} from "../auth/google";
import { clearProfile, fetchProfile, readProfile, type GoogleProfile } from "../auth/profile";
import { forgetSignedIn, readSignedInPreference, rememberSignedIn } from "../auth/session";
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
  reauthHint: boolean;
  profile: GoogleProfile | null;
  syncNow: () => void;
  reloadLive: () => Promise<void>;
  updateField: (gameId: string, field: WritableField, value: string | number | null) => void;
  markRecent: (gameId: string) => void;
  conflict: ConflictPrompt | null;
  resolveConflict: (choice: "sheet" | "app") => void;
  toast: { text: string; undo?: () => void } | null;
  showToast: (text: string, undo?: () => void) => void;
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
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const [reauthHint, setReauthHint] = useState(false);
  const [profile, setProfile] = useState<GoogleProfile | null>(() => readProfile());

  const tokenRef = useRef<string | null>(null);
  const pendingRef = useRef<PendingEdit[]>([]);
  const baseRef = useRef<Game[]>([]);
  const rowRef = useRef<Record<string, number>>({});
  const syncingRef = useRef(false);
  const toastTimer = useRef(0);
  const showToastRef = useRef<(text: string, undo?: () => void) => void>(() => undefined);
  const dictRef = useRef<Dictionary>({});
  const headersRef = useRef<string[]>([]);
  const sourceRef = useRef<"snapshot" | "live">("snapshot");
  const generatedRef = useRef("");
  const epoch = useRef(0);
  const forceConsent = useRef(false);
  const hinted = useRef(false);
  const signingIn = useRef(false);
  const tokenTimer = useRef(0);
  const refreshLiveRef = useRef<(access: string) => Promise<void>>(async () => undefined);

  tokenRef.current = token;
  pendingRef.current = pending;
  baseRef.current = baseGames;
  rowRef.current = rowById;
  dictRef.current = dict;
  headersRef.current = headers;
  sourceRef.current = source;
  generatedRef.current = generatedAt;

  const showToast = useCallback((text: string, undo?: () => void) => {
    setToast({ text, undo });
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

  const notifyReauth = useCallback((once: boolean) => {
    setReauthHint(true);
    if (once) {
      if (hinted.current) return;
      hinted.current = true;
    }
    const stored = localStorage.getItem("cmpc-lang") === "en" ? "en" : "de";
    showToastRef.current(translateUi(stored, "signInAgain"));
  }, []);

  const dropToken = useCallback((options?: { forget?: boolean }) => {
    epoch.current += 1;
    window.clearTimeout(tokenTimer.current);
    setToken(null);
    if (options?.forget) {
      forgetSignedIn();
      forceConsent.current = false;
      hinted.current = false;
      setReauthHint(false);
    }
  }, []);

  const applyToken = useCallback((access: string, expiresIn: number) => {
    setToken(access);
    window.clearTimeout(tokenTimer.current);
    const ticket = epoch.current;
    const delay = Math.max(60, (expiresIn || 3600) - 60) * 1000;
    tokenTimer.current = window.setTimeout(() => {
      if (epoch.current !== ticket || tokenRef.current !== access || !readSignedInPreference()) return;
      void requestToken("", { timeoutMs: SILENT_TOKEN_TIMEOUT_MS })
        .then(({ token: next, expiresIn: nextExpires }) => {
          if (epoch.current !== ticket || tokenRef.current !== access || !readSignedInPreference()) {
            if (next !== tokenRef.current) revokeToken(next);
            return;
          }
          applyToken(next, nextExpires);
        })
        .catch(() => {
          if (epoch.current !== ticket || tokenRef.current !== access) return;
          dropToken();
          notifyReauth(false);
        });
    }, delay);
  }, [dropToken, notifyReauth]);

  const refreshLive = useCallback(
    async (access: string) => {
      const ticket = epoch.current;
      try {
        const { list, translations } = await loadLive(access);
        if (epoch.current !== ticket) return;
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
        if (epoch.current !== ticket) return;
        if (error instanceof SheetsError && error.status === 403) {
          dropToken({ forget: true });
          showToast(t("sheetForbidden"));
        } else if (error instanceof SheetsError && error.status === 401) {
          dropToken();
          notifyReauth(false);
        } else {
          showToast(t("sheetError"));
        }
      }
    },
    [dropToken, notifyReauth, persistLibrary, showToast, t],
  );
  refreshLiveRef.current = refreshLive;

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
        if (!headersRef.current.includes(WRITABLE[edit.field])) {
          remaining = remaining.filter((item) => item.key !== edit.key);
          continue;
        }
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
        dropToken();
        notifyReauth(false);
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
  }, [conflict, dropToken, notifyReauth, showToast, t]);

  useEffect(() => {
    if (!hydrated || !token || !pending.length || conflict || !online) return;
    const handle = window.setTimeout(() => void syncNow(), 650);
    return () => window.clearTimeout(handle);
  }, [hydrated, token, pending, conflict, online, syncNow]);

  const signIn = useCallback(() => {
    if (signingIn.current) return;
    const prompt: TokenPrompt = readSignedInPreference() && !forceConsent.current ? "" : "consent";
    signingIn.current = true;
    window.clearTimeout(tokenTimer.current);
    const ticket = ++epoch.current;
    // The remembered tap still uses an empty prompt. Time it out so a popup
    // Safari never reports back cannot leave Anmelden stuck.
    void requestToken(prompt, { scope: ACCOUNT_SCOPE, ...(prompt === "" ? { timeoutMs: SILENT_TOKEN_TIMEOUT_MS * 2 } : {}) })
      .then(async ({ token: access, expiresIn }) => {
        if (epoch.current !== ticket) {
          if (access !== tokenRef.current) revokeToken(access);
          return;
        }
        forceConsent.current = false;
        hinted.current = false;
        setReauthHint(false);
        rememberSignedIn();
        applyToken(access, expiresIn);
        void fetchProfile(access).then((next) => { if (next) setProfile(next); });
        await refreshLive(access);
      })
      .catch((error: unknown) => {
        if (epoch.current !== ticket) return;
        if (authFailureKind(error) === "cancelled") return;
        // A remembered session can still be restored without the consent screen
        // once the tap gives Safari a user gesture. If Google refuses that, the
        // next tap falls back to the consent prompt.
        if (prompt === "" && navigator.onLine) {
          forceConsent.current = true;
          notifyReauth(false);
          return;
        }
        showToast(t("sheetError"));
      })
      .finally(() => {
        signingIn.current = false;
      });
  }, [applyToken, notifyReauth, refreshLive, showToast, t]);

  const signOut = useCallback(() => {
    const current = tokenRef.current;
    dropToken({ forget: true });
    clearProfile();
    setProfile(null);
    if (current) revokeToken(current);
  }, [dropToken]);

  useEffect(() => () => window.clearTimeout(tokenTimer.current), []);

  // One silent attempt per page load. Popup-blocked (iOS PWA) and other
  // failures stay on the read-only screen until the user taps Anmelden.
  useEffect(() => {
    if (!hydrated || !clientId() || !readSignedInPreference()) return;
    let cancel = false;
    const ticket = epoch.current;
    let consumed: Promise<SessionToken> | null = null;
    const consume = (pending: Promise<SessionToken>) => {
      void pending
        .then(async (result) => {
          const { token: access, expiresIn } = result;
          if (cancel || epoch.current !== ticket || tokenRef.current || !readSignedInPreference()) {
            if (epoch.current !== ticket && access !== tokenRef.current) revokeToken(access);
            return;
          }
          rememberSignedIn();
          applyToken(access, expiresIn);
          if (result.profile) void fetchProfile(access).then((next) => { if (next) setProfile(next); });
          await refreshLiveRef.current(access);
        })
        .catch(() => {
          if (cancel || epoch.current !== ticket || tokenRef.current || !readSignedInPreference()) return;
          notifyReauth(true);
        });
    };
    const start = () => {
      if (cancel || epoch.current !== ticket || tokenRef.current) return;
      const pending = requestRememberedToken();
      if (!pending || pending === consumed) return;
      consumed = pending;
      consume(pending);
    };
    start();
    window.addEventListener("online", start);
    return () => {
      cancel = true;
      window.removeEventListener("online", start);
    };
  }, [hydrated, applyToken, notifyReauth]);

  const reloadLive = useCallback(async () => {
    const access = tokenRef.current;
    if (access) await refreshLive(access);
  }, [refreshLive]);

  const markRecent = useCallback((gameId: string) => setRecent(touchRecent(gameId)), []);

  const updateField = useCallback((gameId: string, field: WritableField, value: string | number | null) => {
    if (!tokenRef.current) return;
    if (!headersRef.current.includes(WRITABLE[field])) return;
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
      reauthHint,
      profile,
      syncNow,
      reloadLive,
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
      reauthHint,
      profile,
      syncNow,
      reloadLive,
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
