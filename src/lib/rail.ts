/** How many cover cards a horizontal rail may mount. Keeps iOS from decoding the whole library. */
export const RAIL_CARD_PX = 146;
export const RAIL_OVERSCAN = 2;

export function railWindow(scrollLeft: number, viewport: number, count: number, cardWidth = RAIL_CARD_PX, overscan = RAIL_OVERSCAN): { start: number; end: number } {
  if (count <= 0) return { start: 0, end: 0 };
  const width = Math.max(cardWidth, viewport);
  const start = Math.max(0, Math.floor(Math.max(0, scrollLeft) / cardWidth) - overscan);
  const across = Math.max(1, Math.ceil(width / cardWidth));
  // Hard cap: a mis-measured rail must not mount every cover. That is what crashed iPhone Safari.
  const end = Math.min(count, start + Math.min(across + overscan * 2, 12));
  return { start, end: Math.max(start + 1, end) };
}
