export const GLOBE_ZOOM_MIN = 1;
export const GLOBE_ZOOM_MAX = 6;

export function clampGlobeZoom(value: number): number {
  if (!Number.isFinite(value)) return GLOBE_ZOOM_MIN;
  return Math.min(GLOBE_ZOOM_MAX, Math.max(GLOBE_ZOOM_MIN, value));
}

/** Wheel and trackpad pinch. `pinch` is a ctrl/meta wheel, which browsers use for trackpad pinch. */
export function globeZoomByWheel(current: number, deltaY: number, pinch: boolean): number {
  const factor = Math.exp(-deltaY * (pinch ? 0.012 : 0.0016));
  return clampGlobeZoom(current * factor);
}

export function globeZoomByPinch(startZoom: number, startDistance: number, distance: number): number {
  if (startDistance <= 0 || distance <= 0) return clampGlobeZoom(startZoom);
  return clampGlobeZoom(startZoom * (distance / startDistance));
}

export function globeZoomStep(current: number, direction: 1 | -1): number {
  return clampGlobeZoom(current * (direction > 0 ? 1.4 : 1 / 1.4));
}
