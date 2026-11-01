import { useEffect, useRef, useState } from "react";
import { H } from "../config";
import { columnLabel, translateProse, translateValue } from "../lib/translate";
import { splitEmojiLabel } from "../lib/text";
import { PLAY_BG, PLAY_DOT, STATUS_BG, STATUS_DOT, STATUS_ORDER } from "../lib/taxonomy";
import { useCollection } from "../state/collection";
import type { Game } from "../types";
import { Cover, TierBadge } from "./bits";

interface Props {
  game: Game | null;
  wideList: boolean;
  onClose: () => void;
  onCover: (game: Game) => void;
}

export function Detail({ game, wideList, onClose, onCover }: Props) {
  const { t, lang, dict, signedIn, updateField, pending } = useCollection();
  const [draft, setDraft] = useState("");
  const timer = useRef(0);
  const notesRef = useRef(game?.notes ?? "");
  notesRef.current = game?.notes ?? "";
  const area = (name: string, value: string) => translateValue(dict, name, value, lang);
  const label = (header: string, fallback: string) => columnLabel(dict, header, lang, fallback);

  useEffect(() => {
    setDraft(notesRef.current);
  }, [game?.id]);

  useEffect(() => {
    if (!game) return;
    if (document.activeElement?.id === "notes") return;
    setDraft(game.notes);
  }, [game]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!game) return <aside className="detail" id="detail" />;

  const dirty = (field: "status" | "rating" | "notes") => pending.some((edit) => edit.gameId === game.id && edit.field === field);
  const play = splitEmojiLabel(area("Spielbarkeit RG477V", game.playability));
  const tags = game.tags.map((tag) => area("Tags", tag));
  const sourceName = area("Quelle", game.sourceLabel) || t("openSource");

  return (
    <aside className="detail on" id="detail">
      <div className="grab">
        <i />
      </div>
      {wideList ? null : (
        <button type="button" className="close" onClick={onClose} aria-label={t("close")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
      <div className="hero">
        {game.coverUrl ? <div className="blur" style={{ backgroundImage: `url('${game.coverUrl}')` }} /> : null}
        <div className="in">
          <button type="button" className="big" onClick={() => onCover(game)} aria-label={t("zoomCover")}>
            <Cover game={game} />
            <span className="zm" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.5-4.5M11 8v6M8 11h6" />
              </svg>
            </span>
          </button>
          <div>
            <h2>{game.title}</h2>
            <div className="sub">
              {game.system} · {game.year ?? t("none")} · {area("Region", game.region)}
            </div>
            <div className="bl">
              <TierBadge tier={game.tier} />
              {game.category ? <span className="badge cat">{area("Kategorie", game.category)}</span> : null}
              {game.cyberpunk && game.cyberpunk !== "kein" ? (
                <span className="badge cyber">Cyberpunk · {area("Cyberpunk-Bezug", game.cyberpunk)}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div className="dbody">
        <section className="card">
          <h3>
            {label(H.status, t("status"))}
            <span className="edit">{signedIn ? t("editable") : t("readOnly")}</span>
          </h3>
          <div className="stat">
            {STATUS_ORDER.map((status) => (
              <button
                key={status}
                type="button"
                disabled={!signedIn}
                className={game.status === status ? "on" : ""}
                style={game.status === status ? { background: STATUS_BG[status], color: "#1f2a44" } : undefined}
                onClick={() => updateField(game.id, "status", status)}
              >
                <span className="dot" style={{ background: STATUS_DOT[status] }} />
                {area("Status", status)}
              </button>
            ))}
          </div>
          {dirty("status") ? <div className="small changed">● {t("changed")}</div> : null}
        </section>
        <section className="card">
          <h3>
            {label(H.rating, t("rating"))}
            <span className="edit">{signedIn ? t("editable") : t("readOnly")}</span>
          </h3>
          <div className="rate">
            {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
              <button
                key={score}
                type="button"
                disabled={!signedIn}
                className={game.rating === score ? "on" : game.rating && score < game.rating ? "lit" : ""}
                onClick={() => updateField(game.id, "rating", game.rating === score ? null : score)}
              >
                {score}
              </button>
            ))}
          </div>
          {dirty("rating") ? <div className="small changed">● {t("changed")}</div> : null}
        </section>
        <section className="card">
          <h3>
            {label(H.notes, t("notes"))}
            <span className="edit">{signedIn ? t("editable") : t("readOnly")}</span>
          </h3>
          <textarea
            id="notes"
            name="notes"
            value={draft}
            readOnly={!signedIn}
            placeholder={t("notesPh")}
            onChange={(event) => {
              const value = event.target.value;
              setDraft(value);
              window.clearTimeout(timer.current);
              timer.current = window.setTimeout(() => updateField(game.id, "notes", value), 500);
            }}
          />
          <div className="small">
            {t("notesHint")} {dirty("notes") ? <span className="changed">● {t("changed")}</span> : null}
          </div>
          {!signedIn ? <div className="small">{t("readOnlyHint")}</div> : null}
        </section>
        <section className="card">
          <h3>{label(H.why, t("why"))}</h3>
          <p>{translateProse(game.why, game.whyEn, lang) || t("none")}</p>
        </section>
        <section className="card">
          <h3>{label(H.playability, t("play"))}</h3>
          {game.playability ? (
            <div className="bl">
              <span className="badge" style={{ background: PLAY_BG[game.playability] ?? "#eee", color: "#1f2a44" }}>
                <span className="dot" style={{ background: PLAY_DOT[game.playability] ?? "#999" }} />
                {play.emoji} {play.label}
              </span>
            </div>
          ) : null}
          <p className="small emu">
            <b>{label(H.emulator, t("emu"))}: </b>
            {translateProse(game.emulator, game.emulatorEn, lang) || t("none")}
          </p>
        </section>
        <section className="card">
          <h3>{t("details")}</h3>
          <dl className="kv">
            <dt>{label(H.genre, t("genre"))}</dt>
            <dd>{game.genre || t("none")}</dd>
            <dt>{label(H.playtime, t("time"))}</dt>
            <dd>{area("Spielzeit", game.playtime) || t("none")}</dd>
            <dt>{label(H.series, t("series"))}</dt>
            <dd>{game.series || t("none")}</dd>
            <dt>{label(H.region, t("region"))}</dt>
            <dd>{area("Region", game.region) || t("none")}</dd>
            <dt>{label(H.category, t("category"))}</dt>
            <dd>{area("Kategorie", game.category) || t("none")}</dd>
            <dt>{label(H.art, t("art"))}</dt>
            <dd>{area("Art", game.art) || t("none")}</dd>
            <dt>{label(H.tags, t("tags"))}</dt>
            <dd>{tags.length ? <div className="tags">{tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div> : t("none")}</dd>
            <dt>{label(H.cyberpunk, t("cyber"))}</dt>
            <dd>{area("Cyberpunk-Bezug", game.cyberpunk) || t("none")}</dd>
            <dt>{label(H.origin, t("origin"))}</dt>
            <dd>{area("Herkunft", game.origin) || t("none")}</dd>
            <dt>{label(H.preservation, t("preservation"))}</dt>
            <dd>{area("Preservation-Status", game.preservation) || t("none")}</dd>
            <dt>{label(H.source, t("source"))}</dt>
            <dd>
              {game.sourceUrl ? (
                <a href={game.sourceUrl} target="_blank" rel="noreferrer">
                  {sourceName}
                </a>
              ) : (
                sourceName || t("none")
              )}
            </dd>
          </dl>
        </section>
        {game.regionDetails ? (
          <section className="card">
            <h3>{label(H.regionDetails, t("regionDetails"))}</h3>
            <p className="small flat">{translateProse(game.regionDetails, game.regionDetailsEn, lang)}</p>
          </section>
        ) : null}
        {game.tierSource ? (
          <section className="card">
            <h3>{label(H.tierSource, t("tierSrc"))}</h3>
            <p className="small flat">{translateProse(game.tierSource, game.tierSourceEn, lang)}</p>
          </section>
        ) : null}
        <p className="dnote">{game.id}</p>
      </div>
    </aside>
  );
}
