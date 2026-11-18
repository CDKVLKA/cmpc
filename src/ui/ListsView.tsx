import { useState } from "react";
import { useCollection } from "../state/collection";
import { useLists } from "../state/lists";
import { Cover } from "./bits";

export function ListsIndex({ onOpen }: { onOpen: (id: string) => void }) {
  const { t, games } = useCollection();
  const lists = useLists();
  const [name, setName] = useState("");
  const count = (ids: string[]) => ids.filter((id) => games.some((game) => game.id === id)).length;
  return (
    <div className="page">
      <h1>{t("tabLists")}</h1>
      <p className="lead">{t("listLead")}</p>
      <form className="inlineform" onSubmit={(event) => { event.preventDefault(); if (lists.createList(name)) setName(""); }}>
        <input name="list" value={name} placeholder={t("newMixtape")} onChange={(event) => setName(event.target.value)} />
        <button type="submit">{t("listCreate")}</button>
      </form>
      <div className="listcards">
        <button type="button" className="listcard" onClick={() => onOpen("favorites")}>
          <b>{t("favorites")}</b>
          <span>{count(lists.favorites)} · {t("listFixed")}</span>
        </button>
        {lists.custom.map((list) => (
          <button key={list.id} type="button" className="listcard" onClick={() => onOpen(list.id)}>
            <b>{list.name}</b>
            <span>{count(list.gameIds)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ListDetail({ id, onOpenGame }: { id: string; onOpenGame: (gameId: string) => void }) {
  const { t, games } = useCollection();
  const lists = useLists();
  const fixed = id === "favorites";
  const custom = lists.custom.find((list) => list.id === id);
  const ids = fixed ? lists.favorites : custom?.gameIds ?? [];
  const [name, setName] = useState(custom?.name ?? "");
  const rows = ids.map((gameId) => games.find((game) => game.id === gameId)).filter((game) => game != null);
  if (!fixed && !custom) return <div className="page"><p>{t("listEmpty")}</p></div>;
  return (
    <div className="page">
      <h1>{fixed ? t("favorites") : custom?.name}</h1>
      {!fixed && custom ? (
        <form className="inlineform" onSubmit={(event) => { event.preventDefault(); lists.renameList(custom.id, name); }}>
          <input name="rename" value={name} onChange={(event) => setName(event.target.value)} />
          <button type="submit">{t("listRename")}</button>
          <button type="button" onClick={() => lists.deleteList(custom.id)}>{t("listDelete")}</button>
        </form>
      ) : null}
      {rows.length === 0 ? <p>{t("listEmpty")}</p> : (
        <div className="toplist">
          {rows.map((game) => (
            <button key={game.id} type="button" className="toprow" onClick={() => onOpenGame(game.id)}>
              <span className="th"><Cover game={game} /></span>
              <span className="rt"><b>{game.title}</b><small>{game.system}</small></span>
              <span className="textlink" onClick={(event) => { event.stopPropagation(); lists.removeFromList(id, game.id); }}>{t("removeGame")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
