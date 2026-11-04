const IMAGE_RE = /IMAGE\(\s*"([^"]+)"/i;
const URL_RE = /https?:\/\/[^\s"'<>)]+/i;

export function str(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    if (Number.isInteger(value)) return String(value);
    return String(value);
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value).replace(/\s+/g, " ").trim();
}

/** Keep internal newlines in notes; collapse other whitespace runs per line. */
export function strKeepLines(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") return str(value);
  return String(value)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .trim();
}

export function parseReleaseDate(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && value > 20000 && value < 80000) {
    return new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000).toISOString().slice(0, 10);
  }
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

export function parseYear(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const match = String(value).match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

export function parseRating(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", ".").trim());
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 1 || rounded > 10) return null;
  return rounded;
}

export function extractUrl(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "object") {
    const record = value as { hyperlink?: unknown; text?: unknown; result?: unknown; formula?: unknown };
    if (typeof record.hyperlink === "string") {
      const fromLink = extractUrl(record.hyperlink);
      if (fromLink) return fromLink;
    }
    if (typeof record.formula === "string") {
      const fromFormula = extractUrl(record.result && record.result !== "" ? record.result : `=${record.formula}`);
      if (fromFormula) return fromFormula;
    }
    if (record.text != null) return extractUrl(record.text);
    return null;
  }
  const text = String(value).trim();
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) return text.replace(/["')\]]+$/, "");
  const image = text.match(IMAGE_RE);
  if (image?.[1]) return image[1];
  const any = text.match(URL_RE);
  return any?.[0] ?? null;
}

export function playtimeBucket(value: string): string {
  const cleaned = value.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  const match = cleaned.match(/^(\p{L}+)/u);
  if (!match) return "unbekannt";
  const word = match[1];
  if (word.toLocaleLowerCase("de") === "unbekannt") return "unbekannt";
  return word;
}

export function splitTags(value: string): string[] {
  if (!value.trim()) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function columnToLetter(index0: number): string {
  if (!Number.isInteger(index0) || index0 < 0) {
    throw new Error(`Ungültiger Spaltenindex: ${index0}`);
  }
  let n = index0 + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/** S–D stay letters; "S (Einschätzung)" → S; anything unrated → unbewertet. */
export function tierKey(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || /^unbewertet/i.test(trimmed)) return "unbewertet";
  const head = trimmed.charAt(0).toUpperCase();
  if ("SABCD".includes(head)) return head;
  return trimmed;
}

/**
 * Compare sheet cells. Numbers 9, "9" and "9.0" match.
 * Null and "" match. Other text is trimmed, otherwise exact.
 */
export function normalizeCell(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Math.abs(value - Math.round(value)) < 1e-9) return String(Math.round(value));
    return String(value);
  }
  const text = String(value).replace(/\r\n/g, "\n").trim();
  if (!text) return "";
  if (/^-?\d+([.,]0+)?$/.test(text)) return String(parseInt(text, 10));
  return text;
}

export function splitEmojiLabel(value: string): { emoji: string; label: string } {
  const space = value.indexOf(" ");
  if (space <= 0) return { emoji: "", label: value };
  return { emoji: value.slice(0, space), label: value.slice(space + 1) };
}

export function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ß/g, "ss")
    .replace(/['’`]/g, "");
}
