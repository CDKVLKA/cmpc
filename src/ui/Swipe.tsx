import { useRef, useState, type ReactNode } from "react";

interface Props {
  enabled: boolean;
  className?: string;
  onNext: () => void;
  onMenu: () => void;
  onLongPress: () => void;
  children: ReactNode;
}

export function Swipe({ enabled, className, onNext, onMenu, onLongPress, children }: Props) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number; dragging: boolean } | null>(null);
  const timer = useRef(0);
  const clear = () => window.clearTimeout(timer.current);

  return (
    <div
      className={`swipe${className ? ` ${className}` : ""}`}
      onPointerDown={(event) => {
        if (!enabled || event.button !== 0) return;
        start.current = { x: event.clientX, y: event.clientY, dragging: false };
        clear();
        timer.current = window.setTimeout(() => {
          start.current = null;
          onLongPress();
        }, 560);
      }}
      onPointerMove={(event) => {
        const origin = start.current;
        if (!origin) return;
        const x = event.clientX - origin.x;
        const y = event.clientY - origin.y;
        if (!origin.dragging) {
          if (Math.abs(x) < 10 && Math.abs(y) < 10) return;
          clear();
          if (Math.abs(y) > Math.abs(x)) {
            start.current = null;
            setDx(0);
            return;
          }
          origin.dragging = true;
        }
        setDx(Math.max(-110, Math.min(110, x)));
      }}
      onPointerUp={() => {
        clear();
        if (dx > 64) onNext();
        else if (dx < -64) onMenu();
        setDx(0);
        start.current = null;
      }}
      onPointerCancel={() => {
        clear();
        setDx(0);
        start.current = null;
      }}
    >
      <div className="swipe-bg" aria-hidden="true"><span>{dx > 0 ? "→" : "←"}</span></div>
      <div className="swipe-fore" style={{ transform: dx ? `translateX(${dx}px)` : undefined }}>{children}</div>
    </div>
  );
}
