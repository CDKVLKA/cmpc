import { useEffect, useRef, useState } from "react";
import { coverUrlFor } from "../lib/covers";
import { useCollection } from "../state/collection";
import type { Game } from "../types";

interface Props {
  game: Game | null;
  onClose: () => void;
}

export function Lightbox({ game, onClose }: Props) {
  const { t } = useCollection();
  const rootRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const url = game ? coverUrlFor(game) : null;

  useEffect(() => {
    if (!game || !url) return;
    const root = rootRef.current;
    const img = imgRef.current;
    if (!root || !img) return;
    const state = { scale: 1, x: 0, y: 0, dy: 0, pointers: new Map<number, { x: number; y: number }>(), pinch: null as { distance: number; scale: number } | null, start: null as { x: number; y: number; tx: number; ty: number; moved: boolean } | null, lastTap: 0 };
    const apply = (animate: boolean) => {
      root.classList.toggle("anim", animate);
      img.style.transform = `translate(${state.x}px, ${state.y + state.dy}px) scale(${state.scale})`;
      root.style.background = `rgba(6,9,18,${0.94 * Math.max(0.25, 1 - Math.abs(state.dy) / 420)})`;
    };
    const zoom = (cx: number, cy: number, next: number, animate: boolean) => {
      const scale = Math.min(8, Math.max(1, next));
      const px = cx - window.innerWidth / 2;
      const py = cy - window.innerHeight / 2;
      state.x = px - (px - state.x) * (scale / state.scale);
      state.y = py - (py - state.y) * (scale / state.scale);
      state.scale = scale;
      if (scale === 1) {
        state.x = 0;
        state.y = 0;
      }
      apply(animate);
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoom(event.clientX, event.clientY, state.scale * Math.exp(-event.deltaY * 0.0018), false);
    };
    const onDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest(".lbx")) return;
      root.setPointerCapture(event.pointerId);
      state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (state.pointers.size === 2) {
        const [a, b] = [...state.pointers.values()];
        state.pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: state.scale };
        state.start = null;
      } else {
        state.start = { x: event.clientX, y: event.clientY, tx: state.x, ty: state.y, moved: false };
      }
    };
    const onMove = (event: PointerEvent) => {
      if (!state.pointers.has(event.pointerId)) return;
      state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (state.pointers.size === 2 && state.pinch) {
        const [a, b] = [...state.pointers.values()];
        zoom((a.x + b.x) / 2, (a.y + b.y) / 2, state.pinch.scale * (Math.hypot(a.x - b.x, a.y - b.y) / state.pinch.distance), false);
        return;
      }
      const start = state.start;
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.hypot(dx, dy) > 6) start.moved = true;
      if (state.scale > 1) {
        state.x = start.tx + dx;
        state.y = start.ty + dy;
        apply(false);
      } else if (start.moved && Math.abs(dy) > Math.abs(dx)) {
        state.dy = dy;
        apply(false);
      }
    };
    const onUp = (event: PointerEvent) => {
      if (!state.pointers.has(event.pointerId)) return;
      state.pointers.delete(event.pointerId);
      if (state.pointers.size < 2) state.pinch = null;
      const start = state.start;
      state.start = null;
      if (!start) return;
      if (state.scale === 1 && state.dy > 110) {
        onCloseRef.current();
        return;
      }
      if (state.dy) {
        state.dy = 0;
        apply(true);
      }
      if (!start.moved) {
        const now = Date.now();
        if (now - state.lastTap < 300) {
          state.lastTap = 0;
          if (state.scale > 1) zoom(0, 0, 1, true);
          else zoom(event.clientX, event.clientY, 2.5, true);
        } else {
          state.lastTap = now;
          window.setTimeout(() => {
            if (state.lastTap === now && state.scale === 1) onCloseRef.current();
          }, 280);
        }
      }
    };
    apply(false);
    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);
    return () => {
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
    };
  }, [game, url]);

  if (!game || !url) return null;
  return (
    <div className="lb" ref={rootRef} role="dialog" aria-modal="true" aria-label={game.title}>
      <img
        ref={imgRef}
        src={url}
        alt={game.title}
        onLoad={(event) => setSize({ w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight })}
      />
      <button type="button" className="lbx" onClick={onClose} aria-label={t("close")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
      <div className="lbcap">
        <b>{game.title}</b>
        {size ? <span className="res orig">{size.w}×{size.h} px · {t("lbOrig")}</span> : null}
        <span className="hint">{t("lbHint")}</span>
      </div>
    </div>
  );
}
