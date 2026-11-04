import { useState } from "react";
import { FAVORITES_MIXTAPE } from "../config";
import type { StringKey } from "../i18n";
import { CURATED, curatedById } from "../lib/curated";
import { useCollection } from "../state/collection";
import { useMixtapes } from "../state/mixtapes";
import { Cover } from "./bits";

const LABEL: Record<string, StringKey> = {
  cyberpunk: "curCyber", "fan-translations": "curFan", "lost-media": "curLost", "s-tier": "curS", "hidden-gems": "curHidden",
};

export function MixtapesIndex({ onOpen }: { onOpen: (id: string) => void }) {
  const { t, signedIn } = useCollection();
  const mixes = useMixtapes();
  const [name, setName] = useState("");
  const favorites = mixes.entries.filter((entry) => entry.mixtape === FAVORITES_MIXTAPE).length;
  return (
    <div className="page">
      <h1>{t("tabMixtapes")}</h1>
      <section className="card">
        <h2>{t("favorites")}</h2>
        {signedIn ? <button type="button" className="textlink" onClick={() => onOpen(FAVORITES_MIXTAPE)}>{favorites}</button> : <p className="small">{t("mixtapePrivate")}</p>}
      </section>
      <section>
        <h2>{t("ownMixtapes")}</h2>
        {signedIn ? (
          <>
            <form className="inlineform" onSubmit={(event) => { event.preventDefault(); mixes.createList(name); setName(""); }}>
              <input name="mixtape" value={name} placeholder={t("newMixtape")} onChange={(event) => setName(event.target.value)} />
              <button type="submit">{t("createMixtape")}</button>
            </form>
            <div className="stack">
              {mixes.names.map((list) => (
                <button key={list} type="button" className="row" onClick={() => onOpen(list)}><span className="rt"><b>{list}</b></span></button>
              ))}
            </div>
          </>
        ) : <p className="small">{t("mixtapePrivate")}</p>}
      </section>
      <section>
        <h2>{t("curatedMixtapes")}</h2>
        <div className="stack">
          {CURATED.map((list) => (
            <button key={list.id} type="button" className="row" onClick={() => onOpen(list.id)}>
              <span className="rt"><b>{t(LABEL[list.id] ?? "curatedMixtapes")}</b>{list.id === "hidden-gems" ? <small>{t("curHiddenHint")}</small> : null}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export function MixtapeDetail({ id, onOpenGame }: { id: string; onOpenGame: (gameId: string) => void }) {
  const { games, t, signedIn } = useCollection();
  const mixes = useMixtapes();
  const [rename, setRename] = useState("");
  const [confirm, setConfirm] = useState(false);
  const curated = curatedById(id);
  if (curated) {
    const list = curated.games(games);
    return (
      <div className="page">
        <h1>{t(LABEL[id] ?? "curatedMixtapes")}</h1>
        <div className="stack">
          {list.map((game) => (
            <button key={game.id} type="button" className="row" onClick={() => onOpenGame(game.id)}>
              <span className="th"><Cover game={game} /></span>
              <span className="rt"><b>{game.title}</b><small>{game.system} · {game.year ?? ""}</small></span>
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (!signedIn) return <div className="page"><p>{t("mixtapePrivate")}</p></div>;
  const rows = mixes.entries.filter((entry) => entry.mixtape === id).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "de"));
  return (
    <div className="page">
      <h1>{id === FAVORITES_MIXTAPE ? t("favorites") : id}</h1>
      {id !== FAVORITES_MIXTAPE ? (
        <form className="inlineform" onSubmit={(event) => { event.preventDefault(); if (rename.trim()) mixes.renameList(id, rename); }}>
          <input name="rename" value={rename} placeholder={t("newMixtape")} onChange={(event) => setRename(event.target.value)} />
          <button type="submit">{t("renameMixtape")}</button>
          <button type="button" onClick={() => setConfirm(true)}>{t("deleteMixtape")}</button>
        </form>
      ) : null}
      {confirm ? (
        <div className="card">
          <p>{t("confirmDelete", { name: id })}</p>
          <div className="daily-actions">
            <button type="button" onClick={() => setConfirm(false)}>{t("close")}</button>
            <button type="button" className="primary" onClick={() => mixes.deleteList(id)}>{t("confirmYes")}</button>
          </div>
        </div>
      ) : null}
      {rows.length === 0 ? <p className="empty">{t("mixtapeEmpty")}</p> : null}
      <div className="stack">
        {rows.map((entry) => {
          const game = games.find((item) => item.id === entry.gameId);
          return (
            <div key={entry.gameId} className="row">
              <button type="button" className="rowmain" onClick={() => onOpenGame(entry.gameId)}>
                <span className="th">{game ? <Cover game={game} /> : <span className="ph">{entry.title}</span>}</span>
                <span className="rt"><b>{game?.title || entry.title}</b><small>{entry.system}</small></span>
              </button>
              <button type="button" aria-label={t("moveUp")} onClick={() => mixes.move(id, entry.gameId, -1)}>↑</button>
              <button type="button" aria-label={t("moveDown")} onClick={() => mixes.move(id, entry.gameId, 1)}>↓</button>
              <button type="button" onClick={() => mixes.removeFrom(id, entry.gameId)}>{t("removeGame")}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
