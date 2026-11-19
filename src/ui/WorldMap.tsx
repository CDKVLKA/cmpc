import { useEffect, useRef } from "react";
import { geoContains, geoOrthographic, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import { clampGlobeZoom, globeZoomByPinch, globeZoomByWheel, globeZoomStep } from "../lib/globeZoom";
import { originForNumeric, originNumeric } from "../lib/origin";

type CountryFeature = Feature<Geometry, { name?: string }> & { id?: string | number };

const countries = feature(
  world as unknown as Topology<{ countries: GeometryCollection }>,
  (world as unknown as Topology<{ countries: GeometryCollection }>).objects.countries,
) as FeatureCollection;

function parseColor(input: string): [number, number, number] {
  const value = input.trim();
  if (value.startsWith("#") && value.length >= 7) {
    return [parseInt(value.slice(1, 3), 16), parseInt(value.slice(3, 5), 16), parseInt(value.slice(5, 7), 16)];
  }
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) return [Number(match[1]), Number(match[2]), Number(match[3])];
  return [27, 37, 64];
}

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  const clamped = Math.min(1, Math.max(0, t));
  const channel = (index: number) => Math.round(a[index] + (b[index] - a[index]) * clamped);
  return [channel(0), channel(1), channel(2)];
}

function rgb(color: [number, number, number]): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

function cssVar(name: string, fallback: string): [number, number, number] {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return parseColor(value || fallback);
}

export function WorldMap({
  counts,
  label,
  unknownLabel,
  zoomInLabel,
  zoomOutLabel,
  onPick,
}: {
  counts: Record<string, number>;
  label: (id: string) => string;
  unknownLabel: string;
  zoomInLabel: string;
  zoomOutLabel: string;
  onPick: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const unknown = counts.Unknown ?? 0;
  const countsRef = useRef(counts);
  countsRef.current = counts;
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const controls = useRef({ zoomIn: () => {}, zoomOut: () => {} });

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const projection = geoOrthographic().precision(0.5);
    const path = geoPath(projection, context);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lambda = -18;
    let phi = -28;
    let zoom = 1;
    let baseScale = 1;
    let dragging = false;
    let pinching = false;
    let moved = 0;
    let lastX = 0;
    let lastY = 0;
    let originX = 0;
    let originY = 0;
    let gesture: "pending" | "drag" | "scroll" | "pinch" = "pending";
    let pinchDistance = 0;
    let zoomAtPinch = 1;
    let lastTap = 0;
    let tapTimer = 0;
    let idleAt = 0;
    let frame = 0;
    let visible = true;
    let lastDraw = 0;
    const pointers = new Map<number, { x: number; y: number }>();
    const numericCount = () => {
      const map = new Map<string, { id: string; count: number }>();
      for (const [id, count] of Object.entries(countsRef.current)) {
        const numeric = originNumeric(id);
        if (!numeric || count <= 0) continue;
        const previous = map.get(numeric);
        map.set(numeric, { id, count: (previous?.count ?? 0) + count });
      }
      return map;
    };

    const resize = () => {
      const width = Math.max(240, Math.min(parent.clientWidth, 520));
      const height = Math.round(width * 0.92);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = "100%";
      canvas.style.height = `${height}px`;
      baseScale = Math.min(canvas.width, canvas.height) * 0.48;
      projection.translate([canvas.width / 2, canvas.height / 2 + height * 0.02 * dpr]);
      applyView();
    };
    const applyView = () => {
      projection.scale(baseScale * zoom).precision(zoom > 3 ? 1.2 : 0.5);
    };
    const setZoom = (next: number) => {
      zoom = clampGlobeZoom(next);
      applyView();
      idleAt = performance.now();
    };

    const draw = () => {
      const byNumeric = numericCount();
      let max = 1;
      for (const entry of byNumeric.values()) max = Math.max(max, entry.count);
      const bg = cssVar("--bg", "#141c2f");
      const accent = cssVar("--accent", "#4f8cff");
      const hot: [number, number, number] = [242, 193, 78];
      const ocean = mix(bg, [64, 112, 176], 0.42);
      const empty = mix(bg, [168, 182, 206], 0.38);
      context.clearRect(0, 0, canvas.width, canvas.height);
      projection.rotate([lambda, phi, 0]);
      context.beginPath();
      path({ type: "Sphere" });
      context.fillStyle = rgb(ocean);
      context.fill();
      context.save();
      context.beginPath();
      path({ type: "Sphere" });
      context.clip();
      for (const country of countries.features as CountryFeature[]) {
        const numeric = String(Number(country.id ?? ""));
        const hit = byNumeric.get(numeric);
        const amount = hit ? Math.sqrt(hit.count / max) : 0;
        context.beginPath();
        path(country as GeoPermissibleObjects);
        const heat = amount < 0.62 ? mix(empty, accent, amount / 0.62) : mix(accent, hot, (amount - 0.62) / 0.38);
        context.fillStyle = rgb(hit ? heat : empty);
        context.fill();
        context.strokeStyle = "rgba(8, 14, 28, 0.35)";
        context.lineWidth = 1;
        context.stroke();
      }
      context.restore();
      context.beginPath();
      path({ type: "Sphere" });
      context.strokeStyle = "rgba(255, 255, 255, 0.28)";
      context.lineWidth = 1.5;
      context.stroke();
    };

    const tick = (now: number) => {
      if (visible && now - lastDraw > 32) {
        lastDraw = now;
        if (!dragging && !pinching && !reduced && now - idleAt > 900) lambda = (lambda + 0.11) % 360;
        draw();
      }
      frame = window.requestAnimationFrame(tick);
    };

    const point = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return [(event.clientX - rect.left) * (canvas.width / rect.width), (event.clientY - rect.top) * (canvas.height / rect.height)];
    };

    const pointerSpan = () => {
      const pts = [...pointers.values()];
      if (pts.length < 2) return 0;
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    };
    const pickAt = (x: number, y: number) => {
      const lonlat = projection.invert?.([x, y]);
      if (!lonlat) return;
      for (const country of countries.features as CountryFeature[]) {
        if (!geoContains(country, lonlat)) continue;
        const id = originForNumeric(String(country.id ?? ""));
        const count = id ? countsRef.current[id] ?? 0 : 0;
        if (id && count > 0) onPickRef.current(id);
        return;
      }
    };
    const rotateBy = (dx: number, dy: number) => {
      const rect = canvas.getBoundingClientRect();
      lambda += (dx / Math.max(rect.width, 1)) * 160;
      phi = Math.max(-70, Math.min(70, phi - (dy / Math.max(rect.height, 1)) * 110));
    };
    const onDown = (event: PointerEvent) => {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size >= 2) {
        gesture = "pinch";
        pinching = true;
        dragging = false;
        pinchDistance = pointerSpan();
        zoomAtPinch = zoom;
        idleAt = performance.now();
        return;
      }
      moved = 0;
      lastX = event.clientX;
      lastY = event.clientY;
      originX = event.clientX;
      originY = event.clientY;
      if (event.pointerType === "touch") {
        gesture = "pending";
        return;
      }
      gesture = "drag";
      dragging = true;
      canvas.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size >= 2) {
        const distance = pointerSpan();
        if (pinchDistance > 0) setZoom(globeZoomByPinch(zoomAtPinch, pinchDistance, distance));
        return;
      }
      if (gesture === "scroll" || gesture === "pinch") return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      if (gesture === "pending") {
        const adx = Math.abs(event.clientX - originX);
        const ady = Math.abs(event.clientY - originY);
        if (adx < 10 && ady < 10) return;
        if (ady > adx) {
          gesture = "scroll";
          return;
        }
        gesture = "drag";
        dragging = true;
        lastX = event.clientX;
        lastY = event.clientY;
        idleAt = performance.now();
        return;
      }
      moved += Math.abs(dx) + Math.abs(dy);
      lastX = event.clientX;
      lastY = event.clientY;
      rotateBy(dx, dy);
    };
    let skipTap = false;
    const onUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (pointers.size >= 2) return;
      if (pinching) {
        pinching = false;
        dragging = false;
        gesture = "pending";
        idleAt = performance.now();
        skipTap = true;
        return;
      }
      if (skipTap) {
        skipTap = false;
        return;
      }
      const wasDrag = gesture === "drag" && moved > 8;
      const wasScroll = gesture === "scroll";
      dragging = false;
      gesture = "pending";
      idleAt = performance.now();
      if (wasDrag || wasScroll) return;
      const now = performance.now();
      const [x, y] = point(event);
      if (now - lastTap < 280) {
        window.clearTimeout(tapTimer);
        lastTap = 0;
        setZoom(1);
        return;
      }
      lastTap = now;
      window.clearTimeout(tapTimer);
      tapTimer = window.setTimeout(() => pickAt(x, y), 280);
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom(globeZoomByWheel(zoom, event.deltaY, event.ctrlKey || event.metaKey));
    };
    controls.current = {
      zoomIn: () => setZoom(globeZoomStep(zoom, 1)),
      zoomOut: () => setZoom(globeZoomStep(zoom, -1)),
    };

    resize();
    idleAt = performance.now();
    frame = window.requestAnimationFrame(tick);
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    const visibility = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
    });
    visibility.observe(canvas);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(tapTimer);
      observer.disconnect();
      visibility.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <div className="world">
      <canvas ref={canvasRef} aria-label={label("globe")} />
      <div className="zoom">
        <button type="button" aria-label={zoomInLabel} onClick={() => controls.current.zoomIn()}>+</button>
        <button type="button" aria-label={zoomOutLabel} onClick={() => controls.current.zoomOut()}>−</button>
      </div>
      <button type="button" className="unknown" onClick={() => unknown && onPick("Unknown")} disabled={!unknown}>
        {unknownLabel} · {unknown}
      </button>
    </div>
  );
}
