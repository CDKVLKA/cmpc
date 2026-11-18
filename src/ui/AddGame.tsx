import { useMemo, useState } from "react";
import { H, WRITABLE } from "../config";
import { nextGameId, sameTitleAndSystem } from "../lib/newGame";
import { SYSMETA } from "../lib/systems";
import { STATUS_ORDER } from "../lib/taxonomy";
import { appendGameRow } from "../sheets/api";
import { useCollection } from "../state/collection";

export function AddGame({ onClose, onOpen }: { onClose: () => void; onOpen: (id: string) => void }) {
  const { games, signedIn, accessToken, t, showToast, signIn, reloadLive } = useCollection();
  const systems = useMemo(() => {
    const names = new Set<string>([...Object.keys(SYSMETA), ...games.map((game) => game.system)]);
    return [...names].filter(Boolean).sort((a, b) => a.localeCompare(b, "de"));
  }, [games]);
  const genres = useMemo(() => [...new Set(games.map((game) => game.genre).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de")), [games]);
  const categories = useMemo(() => [...new Set(games.map((game) => game.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de")), [games]);
  const [title, setTitle] = useState("");
  const [system, setSystem] = useState(systems[0] ?? "PC");
  const [year, setYear] = useState("");
  const [genre, setGenre] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<string>("Offen");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed || !system) return;
    const existing = sameTitleAndSystem(games, trimmed, system);
    if (existing) {
      setDuplicateId(existing.id);
      return;
    }
    if (!signedIn || !accessToken) {
      signIn();
      return;
    }
    setBusy(true);
    try {
      const id = nextGameId(games, system);
      const values: Record<string, string | number> = {
        [H.id]: id,
        [H.title]: trimmed,
        [H.system]: system,
        [H.status]: status,
      };
      if (year.trim()) values[H.year] = Number(year);
      if (genre.trim()) values[H.genre] = genre.trim();
      if (category.trim()) values[H.category] = category.trim();
      if (notes.trim()) values[WRITABLE.notes] = notes.trim();
      await appendGameRow(accessToken, values);
      showToast(t("newGameSaved"));
      await reloadLive();
      onOpen(id);
      onClose();
    } catch {
      showToast(t("sheetError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-title">
      <form
        className="modalcard addgame"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <h2 id="add-title">{t("addTitle")}</h2>
        {!signedIn ? <p>{t("addTitleNeedSignIn")}</p> : <p>{t("addTitleLead")}</p>}
        <label>{t("fieldTitle")}<input name="title" value={title} required onChange={(event) => { setTitle(event.target.value); setDuplicateId(null); }} /></label>
        <label>{t("fSystem")}<select name="system" value={system} onChange={(event) => { setSystem(event.target.value); setDuplicateId(null); }}>{systems.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label>{t("year")}<input name="year" inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value)} /></label>
        <label>{t("genre")}<input name="genre" list="genre-options" value={genre} onChange={(event) => setGenre(event.target.value)} /></label>
        <datalist id="genre-options">{genres.map((name) => <option key={name} value={name} />)}</datalist>
        <label>{t("category")}<input name="category" list="category-options" value={category} onChange={(event) => setCategory(event.target.value)} /></label>
        <datalist id="category-options">{categories.map((name) => <option key={name} value={name} />)}</datalist>
        <label>{t("status")}<select name="status" value={status} onChange={(event) => setStatus(event.target.value)}>{STATUS_ORDER.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
        <label>{t("notes")}<textarea name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        {duplicateId ? (
          <p className="warn">
            {t("newGameDuplicate")}
            <button type="button" onClick={() => { onOpen(duplicateId); onClose(); }}>{t("newGameOpenExisting")}</button>
          </p>
        ) : null}
        <div className="modalactions">
          <button type="button" onClick={onClose}>{t("close")}</button>
          <button type="submit" className="primary" disabled={busy || !title.trim()}>{signedIn ? t("addTitle") : t("signIn")}</button>
        </div>
      </form>
    </div>
  );
}
