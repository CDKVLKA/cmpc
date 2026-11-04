import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FAVORITES_MIXTAPE } from "../config";
import { readKv, writeKv } from "../db";
import { berlinDate } from "../lib/daily";
import { applyOps, decideRowChange, fingerprint, mixtapeNames, type MixOp } from "../lib/mixtape";
import type { MixtapeEntry } from "../lib/parse";
import { appendMixtape, deleteMixtapeRows, readMixtapeSheet, writeMixtapeField } from "../sheets/mixtapeApi";
import type { Game } from "../types";
import { useCollection } from "./collection";

interface MixConflict { op: MixOp; sheetValue: string; appValue: string }

interface MixtapeValue {
  entries: MixtapeEntry[];
  names: string[];
  ops: MixOp[];
  conflict: MixConflict | null;
  isFavorite: (gameId: string) => boolean;
  toggleFavorite: (game: Game) => void;
  addTo: (mixtape: string, game: Game) => void;
  removeFrom: (mixtape: string, gameId: string) => void;
  createList: (name: string) => void;
  renameList: (from: string, to: string) => void;
  deleteList: (name: string) => void;
  move: (mixtape: string, gameId: string, direction: -1 | 1) => void;
  resolve: (choice: "sheet" | "app") => void;
  syncNow: () => void;
}

const MixtapeContext = createContext<MixtapeValue | null>(null);
const stamp = (kind: string, mixtape: string, gameId = "") => `${kind}:${mixtape}:${gameId}:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`;

export function MixtapeProvider({ children }: { children: ReactNode }) {
  const { accessToken, signedIn, online, showToast, t, markRecent } = useCollection();
  const [base, setBase] = useState<MixtapeEntry[]>([]);
  const [ops, setOps] = useState<MixOp[]>([]);
  const [ready, setReady] = useState(false);
  const [conflict, setConflict] = useState<MixConflict | null>(null);
  const opsRef = useRef(ops);
  const syncing = useRef(false);
  opsRef.current = ops;

  useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        const [stored, queued] = await Promise.all([readKv<MixtapeEntry[]>("mixtapes"), readKv<MixOp[]>("mixops")]);
        if (cancel) return;
        if (stored) setBase(stored);
        if (queued) setOps(queued);
      } catch { /* private mode */ }
      if (!cancel) setReady(true);
    })();
    return () => { cancel = true; };
  }, []);

  useEffect(() => { if (ready) writeKv("mixops", ops).catch(() => undefined); }, [ops, ready]);
  useEffect(() => { if (ready) writeKv("mixtapes", base).catch(() => undefined); }, [base, ready]);

  const reload = useCallback(async (token: string) => {
    const rows = await readMixtapeSheet(token);
    setBase(rows);
    return rows;
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    void reload(accessToken).catch(() => showToast(t("sheetError")));
  }, [accessToken, reload, showToast, t]);

  const entries = useMemo(() => applyOps(base, ops), [base, ops]);
  const names = useMemo(() => mixtapeNames(base, ops).filter((name) => name !== FAVORITES_MIXTAPE), [base, ops]);
  const queue = useCallback((op: MixOp) => {
    setOps((current) => [...current, op]);
    if (!navigator.onLine) showToast(t("offlineSaved"));
  }, [showToast, t]);

  const toggleFavorite = useCallback((game: Game) => {
    if (!signedIn) return;
    markRecent(game.id);
    const current = applyOps(base, opsRef.current);
    const found = current.find((entry) => entry.mixtape === FAVORITES_MIXTAPE && entry.gameId === game.id);
    if (found) {
      const pendingAdd = opsRef.current.find((op) => op.kind === "add" && op.mixtape === FAVORITES_MIXTAPE && op.gameId === game.id);
      if (pendingAdd && found.row === 0) {
        setOps((list) => list.filter((op) => op.key !== pendingAdd.key));
        return;
      }
      queue({ key: stamp("remove", FAVORITES_MIXTAPE, game.id), kind: "remove", mixtape: FAVORITES_MIXTAPE, gameId: game.id, base: fingerprint(found) });
      return;
    }
    const order = Math.max(0, ...current.filter((entry) => entry.mixtape === FAVORITES_MIXTAPE).map((entry) => entry.order)) + 1;
    queue({ key: stamp("add", FAVORITES_MIXTAPE, game.id), kind: "add", mixtape: FAVORITES_MIXTAPE, gameId: game.id, title: game.title, system: game.system, order, added: berlinDate() });
  }, [base, markRecent, queue, signedIn]);

  const addTo = useCallback((mixtape: string, game: Game) => {
    const name = mixtape.trim();
    if (!signedIn || !name) return;
    const current = applyOps(base, opsRef.current);
    if (current.some((entry) => entry.mixtape === name && entry.gameId === game.id)) return;
    const order = Math.max(0, ...current.filter((entry) => entry.mixtape === name).map((entry) => entry.order)) + 1;
    queue({ key: stamp("add", name, game.id), kind: "add", mixtape: name, gameId: game.id, title: game.title, system: game.system, order, added: berlinDate() });
    markRecent(game.id);
  }, [base, markRecent, queue, signedIn]);

  const removeFrom = useCallback((mixtape: string, gameId: string) => {
    if (!signedIn) return;
    const found = applyOps(base, opsRef.current).find((entry) => entry.mixtape === mixtape && entry.gameId === gameId);
    if (!found) return;
    const pendingAdd = opsRef.current.find((op) => op.kind === "add" && op.mixtape === mixtape && op.gameId === gameId);
    if (pendingAdd && found.row === 0) {
      setOps((list) => list.filter((op) => op.key !== pendingAdd.key));
      return;
    }
    queue({ key: stamp("remove", mixtape, gameId), kind: "remove", mixtape, gameId, base: fingerprint(found) });
  }, [base, queue, signedIn]);

  const createList = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!signedIn || !trimmed || trimmed === FAVORITES_MIXTAPE || mixtapeNames(base, opsRef.current).includes(trimmed)) return;
    queue({ key: stamp("create", trimmed), kind: "create", mixtape: trimmed });
  }, [base, queue, signedIn]);

  const renameList = useCallback((from: string, to: string) => {
    const trimmed = to.trim();
    if (!signedIn || !trimmed || from === FAVORITES_MIXTAPE || trimmed === FAVORITES_MIXTAPE) return;
    queue({ key: stamp("rename", from), kind: "rename", from, to: trimmed });
  }, [queue, signedIn]);

  const deleteList = useCallback((name: string) => {
    if (!signedIn || name === FAVORITES_MIXTAPE) return;
    queue({ key: stamp("drop", name), kind: "drop", mixtape: name });
  }, [queue, signedIn]);

  const move = useCallback((mixtape: string, gameId: string, direction: -1 | 1) => {
    if (!signedIn) return;
    const current = applyOps(base, opsRef.current).filter((entry) => entry.mixtape === mixtape).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "de"));
    const index = current.findIndex((entry) => entry.gameId === gameId);
    const swap = index + direction;
    if (index < 0 || swap < 0 || swap >= current.length) return;
    const reordered = [...current];
    const [item] = reordered.splice(index, 1);
    if (!item) return;
    reordered.splice(swap, 0, item);
    const next = reordered.map((entry, position) => ({
      key: stamp("order", mixtape, entry.gameId), kind: "order" as const, mixtape, gameId: entry.gameId, order: position + 1, base: fingerprint(entry),
    })).filter((op) => op.order !== current.find((entry) => entry.gameId === op.gameId)?.order);
    if (next.length) setOps((list) => [...list, ...next]);
  }, [base, signedIn]);

  const syncNow = useCallback(async () => {
    const token = accessToken;
    if (!token || syncing.current || conflict || !online || !opsRef.current.some((op) => op.kind !== "create")) return;
    syncing.current = true;
    try {
      let sheet = await readMixtapeSheet(token);
      let remaining = [...opsRef.current];
      for (const op of [...remaining]) {
        if (op.kind === "create") continue;
        if (op.kind === "rename") {
          for (const row of sheet.filter((entry) => entry.mixtape === op.from)) {
            await writeMixtapeField(token, row.row, "Mixtape", op.to);
          }
        } else if (op.kind === "drop") {
          await deleteMixtapeRows(token, sheet.filter((entry) => entry.mixtape === op.mixtape).map((entry) => entry.row));
        } else {
          const existing = sheet.find((entry) => entry.mixtape === op.mixtape && entry.gameId === op.gameId) ?? null;
          if (op.kind === "add") {
            const decision = decideRowChange(existing, "", fingerprint(op));
            if (decision === "conflict") { setConflict({ op, sheetValue: existing ? fingerprint(existing) : t("emptyValue"), appValue: fingerprint(op) }); setOps(remaining); return; }
            if (decision === "append") await appendMixtape(token, op);
            else if (decision === "update" && existing) await writeMixtapeField(token, existing.row, "Reihenfolge", op.order);
          } else if (op.kind === "remove") {
            const decision = decideRowChange(existing, op.base, null);
            if (decision === "conflict") { setConflict({ op, sheetValue: existing ? fingerprint(existing) : t("emptyValue"), appValue: t("emptyValue") }); setOps(remaining); return; }
            if (decision === "remove" && existing) await deleteMixtapeRows(token, [existing.row]);
          } else {
            const added = existing?.added ?? "";
            const desired = fingerprint({ mixtape: op.mixtape, gameId: op.gameId, order: op.order, added });
            const decision = decideRowChange(existing, op.base, desired);
            if (decision === "conflict") { setConflict({ op, sheetValue: existing ? String(existing.order) : t("emptyValue"), appValue: String(op.order) }); setOps(remaining); return; }
            if (decision === "update" && existing) await writeMixtapeField(token, existing.row, "Reihenfolge", op.order);
          }
        }
        remaining = remaining.filter((item) => item.key !== op.key);
        sheet = await readMixtapeSheet(token);
      }
      setOps(remaining);
      setBase(sheet);
    } catch {
      showToast(t("sheetError"));
    } finally {
      syncing.current = false;
    }
  }, [accessToken, conflict, online, showToast, t]);

  useEffect(() => {
    if (!ready || !accessToken || conflict || !online || !ops.some((op) => op.kind !== "create")) return;
    const handle = window.setTimeout(() => void syncNow(), 700);
    return () => window.clearTimeout(handle);
  }, [ready, accessToken, ops, conflict, online, syncNow]);

  const resolve = useCallback((choice: "sheet" | "app") => {
    const current = conflict;
    if (!current) return;
    setConflict(null);
    if (choice === "sheet") {
      setOps((list) => list.filter((op) => op.key !== current.op.key));
      if (accessToken) void reload(accessToken);
      return;
    }
    const forced = current.op.kind === "remove" || current.op.kind === "order" ? { ...current.op, base: "" } : current.op;
    setOps((list) => list.map((op) => (op.key === current.op.key ? forced : op)));
  }, [accessToken, conflict, reload]);

  const value = useMemo<MixtapeValue>(() => ({
    entries: signedIn ? entries : [],
    names: signedIn ? names : [],
    ops: signedIn ? ops : [],
    conflict,
    isFavorite: (gameId) => signedIn && entries.some((entry) => entry.mixtape === FAVORITES_MIXTAPE && entry.gameId === gameId),
    toggleFavorite, addTo, removeFrom, createList, renameList, deleteList, move, resolve, syncNow,
  }), [signedIn, entries, names, ops, conflict, toggleFavorite, addTo, removeFrom, createList, renameList, deleteList, move, resolve, syncNow]);

  return <MixtapeContext.Provider value={value}>{children}</MixtapeContext.Provider>;
}

export function useMixtapes(): MixtapeValue {
  const value = useContext(MixtapeContext);
  if (!value) throw new Error("useMixtapes outside provider");
  return value;
}
