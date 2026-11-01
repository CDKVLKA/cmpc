import { useState } from "react";
import { coverUrlFor } from "../lib/covers";
import { tierKey } from "../lib/text";
import { TIER_BG, TIER_FG } from "../lib/taxonomy";
import type { Game } from "../types";

export function Cover({ game }: { game: Game }) {
  const url = coverUrlFor(game);
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <div className="ph">{game.title}</div>;
  return <img src={url} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

export function TierBadge({ tier }: { tier: string }) {
  const key = tierKey(tier);
  return (
    <span className="tierb" style={{ background: TIER_BG[key] ?? "#d5dbe6", color: TIER_FG[key] ?? "#1f2a44" }}>
      {key === "unbewertet" ? "?" : key}
    </span>
  );
}

export function Dot({ color, title }: { color: string; title?: string }) {
  return <span className="dot" title={title} style={{ background: color }} />;
}
