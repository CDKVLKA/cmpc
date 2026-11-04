const KEY = "cmpc-recent";

export function readRecent(): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function touchRecent(id: string, now = Date.now()): Record<string, number> {
  const next = { ...readRecent(), [id]: now };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
