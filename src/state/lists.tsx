import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { localListRepository, nextListId, toggleId, type StoredLists, type UserList } from "../lib/lists";
import type { Game } from "../types";
import { useCollection } from "./collection";

interface ListsValue {
  favorites: string[];
  custom: UserList[];
  isFavorite: (gameId: string) => boolean;
  toggleFavorite: (game: Game) => void;
  inList: (listId: string, gameId: string) => boolean;
  addToList: (listId: string, gameId: string) => void;
  removeFromList: (listId: string, gameId: string) => void;
  createList: (name: string) => string | null;
  renameList: (id: string, name: string) => void;
  deleteList: (id: string) => void;
}

const ListsContext = createContext<ListsValue | null>(null);
const repo = localListRepository();

export function ListsProvider({ children }: { children: ReactNode }) {
  const { games, updateField } = useCollection();
  const [data, setData] = useState<StoredLists>(() => repo.load());
  const removed = useRef(new Set<string>());

  useEffect(() => {
    repo.save(data);
  }, [data]);

  useEffect(() => {
    const fromSheet = games.filter((game) => game.favorite).map((game) => game.id);
    if (!fromSheet.length) return;
    setData((current) => {
      const extra = fromSheet.filter((id) => !current.favorites.includes(id) && !removed.current.has(id));
      if (!extra.length) return current;
      return { ...current, favorites: [...current.favorites, ...extra] };
    });
  }, [games]);

  const toggleFavorite = useCallback((game: Game) => {
    setData((current) => {
      const on = !current.favorites.includes(game.id);
      if (on) removed.current.delete(game.id);
      else removed.current.add(game.id);
      updateField(game.id, "favorite", on ? "Ja" : "");
      return { ...current, favorites: toggleId(current.favorites, game.id) };
    });
  }, [updateField]);

  const addToList = useCallback((listId: string, gameId: string) => {
    if (listId === "favorites") {
      setData((current) => (current.favorites.includes(gameId) ? current : { ...current, favorites: [...current.favorites, gameId] }));
      updateField(gameId, "favorite", "Ja");
      return;
    }
    setData((current) => ({
      ...current,
      custom: current.custom.map((list) => (list.id === listId && !list.gameIds.includes(gameId) ? { ...list, gameIds: [...list.gameIds, gameId] } : list)),
    }));
  }, [updateField]);

  const removeFromList = useCallback((listId: string, gameId: string) => {
    if (listId === "favorites") {
      removed.current.add(gameId);
      setData((current) => ({ ...current, favorites: current.favorites.filter((id) => id !== gameId) }));
      updateField(gameId, "favorite", "");
      return;
    }
    setData((current) => ({
      ...current,
      custom: current.custom.map((list) => (list.id === listId ? { ...list, gameIds: list.gameIds.filter((id) => id !== gameId) } : list)),
    }));
  }, [updateField]);

  const createList = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    let created: string | null = null;
    setData((current) => {
      if (current.custom.some((list) => list.name.toLocaleLowerCase("de") === trimmed.toLocaleLowerCase("de"))) return current;
      created = nextListId();
      return { ...current, custom: [...current.custom, { id: created, name: trimmed, gameIds: [] }] };
    });
    return created;
  }, []);

  const renameList = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setData((current) => ({
      ...current,
      custom: current.custom.map((list) => (list.id === id ? { ...list, name: trimmed } : list)),
    }));
  }, []);

  const deleteList = useCallback((id: string) => {
    setData((current) => ({ ...current, custom: current.custom.filter((list) => list.id !== id) }));
  }, []);

  const value = useMemo<ListsValue>(() => ({
    favorites: data.favorites,
    custom: data.custom,
    isFavorite: (gameId) => data.favorites.includes(gameId),
    toggleFavorite,
    inList: (listId, gameId) => (listId === "favorites" ? data.favorites.includes(gameId) : data.custom.some((list) => list.id === listId && list.gameIds.includes(gameId))),
    addToList,
    removeFromList,
    createList,
    renameList,
    deleteList,
  }), [data, toggleFavorite, addToList, removeFromList, createList, renameList, deleteList]);

  return <ListsContext.Provider value={value}>{children}</ListsContext.Provider>;
}

export function useLists(): ListsValue {
  const value = useContext(ListsContext);
  if (!value) throw new Error("useLists outside provider");
  return value;
}
