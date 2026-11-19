import { useEffect, useRef } from "react";
import { geoContains, geoOrthographic, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
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
  onPick,
}: {
  counts: Record<string, number>;
  label: (id: string) => string;
  unknownLabel: string;
  onPick: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const unknown = counts.Unknown ?? 0;
  const countsRef = useRef(counts);
  countsRef.current = counts;
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

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
    let dragging = false;
    let moved = 0;
    let lastX = 0;
    let lastY = 0;
    let idleAt = 0;
    let frame = 0;
    let visible = true;
    let lastDraw = 0;
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
      projection.translate([canvas.width / 2, canvas.height / 2 + height * 0.02 * dpr]).scale(Math.min(canvas.width, canvas.height) * 0.48);
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
        if (!dragging && !reduced && now - idleAt > 700) lambda = (lambda + 0.11) % 360;
        draw();
      }
      frame = window.requestAnimationFrame(tick);
    };

    const point = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return [(event.clientX - rect.left) * (canvas.width / rect.width), (event.clientY - rect.top) * (canvas.height / rect.height)];
    };

    const onDown = (event: PointerEvent) => {
      dragging = true;
      moved = 0;
      lastX = event.clientX;
      lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      lastX = event.clientX;
      lastY = event.clientY;
      const rect = canvas.getBoundingClientRect();
      lambda += (dx / Math.max(rect.width, 1)) * 160;
      phi = Math.max(-70, Math.min(70, phi - (dy / Math.max(rect.height, 1)) * 110));
    };
    const onUp = (event: PointerEvent) => {
      const wasDrag = moved > 8;
      dragging = false;
      idleAt = performance.now();
      if (wasDrag) return;
      const [x, y] = point(event);
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
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <div className="world">
      <canvas ref={canvasRef} aria-label={label("globe")} />
      <button type="button" className="unknown" onClick={() => unknown && onPick("Unknown")} disabled={!unknown}>
        {unknownLabel} · {unknown}
      </button>
    </div>
  );
}
