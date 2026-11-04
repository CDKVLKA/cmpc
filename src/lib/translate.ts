import type { Dictionary, Lang } from "../types";

/** Genre stays English. Personal notes are never translated. */
const UNTRANSLATED = new Set(["Genre", "Eigene Notizen"]);

export function translateValue(
  dict: Dictionary,
  area: string,
  value: string | null | undefined,
  lang: Lang,
): string {
  if (value == null || value === "") return "";
  if (lang === "de" || UNTRANSLATED.has(area)) return value;
  const table = dict[area] ?? {};
  const direct = table[value];
  if (direct) return direct;
  if (area === "Spielzeit") return translatePlaytime(table, value);
  if (area === "Tags") {
    return value
      .split(",")
      .map((part) => {
        const key = part.trim();
        return table[key] || key;
      })
      .join(", ");
  }
  if (area === "Tier") {
    return value
      .replaceAll("unbewertet", table.unbewertet || "unrated")
      .replaceAll("(Einschätzung)", table["(Einschätzung)"] || "(estimate)");
  }
  if (area === "Region") return translateRegion(table, value);
  return value;
}

function translatePlaytime(table: Record<string, string>, value: string): string {
  const match = value.match(/^(.*?)\s*(\(.*\))?$/);
  const base = (match?.[1] ?? value).trim();
  let rest = (match?.[2] ?? "").trim();
  const translatedBase = table[base] || base;
  rest = rest.replace(/(\d),(\d)/g, "$1.$2");
  if (table["h gesamt"]) rest = rest.replaceAll("h gesamt", table["h gesamt"]);
  return rest ? `${translatedBase} ${rest}` : translatedBase;
}

function translateRegion(table: Record<string, string>, value: string): string {
  const entries = Object.entries(table)
    .filter(([german]) => german && german !== " · ")
    .sort((a, b) => b[0].length - a[0].length);
  let out = value;
  for (const [german, english] of entries) {
    if (german === english) continue;
    out = out.split(german).join(english);
  }
  return out;
}

/** Free text: English column when it has text, otherwise the German original. */
export function translateProse(german: string, english: string, lang: Lang): string {
  if (lang === "de") return german;
  const trimmed = english.trim();
  return trimmed || german;
}

export function columnLabel(dict: Dictionary, header: string, lang: Lang, fallback: string): string {
  if (lang === "de") return fallback;
  return dict["Spaltennamen"]?.[header] || fallback;
}
