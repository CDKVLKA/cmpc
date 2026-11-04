import { useState } from "react";
import { berlinDate, gameOfTheDay } from "../lib/daily";
import { translateProse } from "../lib/translate";
import { useCollection } from "../state/collection";
import { Cover } from "./bits";

export function Daily({ onOpen }: { onOpen: (id: string) => void }) {
  const { games, lang, t } = useCollection();
  const [salt, setSalt] = useState(0);
  const date = berlinDate();
  const game = gameOfTheDay(games, date, salt);
  if (!game) return null;
  const sections = [
    { title: t("dailyWhat"), text: translateProse(game.summary, game.summaryEn, lang) },
    { title: t("special"), text: translateProse(game.special, game.specialEn, lang) },
    { title: t("history"), text: translateProse(game.history, game.historyEn, lang) },
    { title: game.releaseDate ? t("world") : t("worldYear"), text: translateProse(game.world, game.worldEn, lang) },
  ].filter((section) => section.text);
  const when = [game.system, game.year ? String(game.year) : "", game.releaseDate].filter(Boolean).join(" · ");
  return (
    <article className="daily">
      <p className="kicker">{t("dailyKicker")} · {date}</p>
      <div className="daily-head">
        <button type="button" className="daily-cover" onClick={() => onOpen(game.id)} aria-label={t("dailyOpen")}>
          <Cover game={game} />
        </button>
        <div>
          <h2>{game.title}</h2>
          <p className="when">{when}</p>
        </div>
      </div>
      {sections.map((section) => (
        <section key={section.title}><h3>{section.title}</h3><p>{section.text}</p></section>
      ))}
      <div className="daily-actions">
        <button type="button" onClick={() => setSalt((value) => value + 1)}>{t("dailyReroll")}</button>
        <button type="button" className="primary" onClick={() => onOpen(game.id)}>{t("dailyOpen")}</button>
      </div>
    </article>
  );
}
