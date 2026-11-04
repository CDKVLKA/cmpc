const FOCUSABLE = "button, a[href], input, textarea, select";

export function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
}

export function spatialMove(dx: number, dy: number): void {
  const detail = document.getElementById("detail");
  const phoneSheet = window.innerWidth <= 760 && detail?.classList.contains("on");
  const scope = phoneSheet && detail ? detail : document.getElementById("app");
  if (!scope) return;
  const nodes = [...scope.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => {
    if (element.matches(":disabled") || element.closest("[hidden], .lb")) return false;
    const view = element.closest(".view");
    if (view && !view.classList.contains("on")) return false;
    if (element.closest("#detail") && detail && !detail.classList.contains("on")) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 1 && rect.height > 1;
  });
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !nodes.includes(active)) {
    const homeCard = document.querySelector<HTMLElement>(".view.on .syscard.cur");
    const firstGame = document.querySelector<HTMLElement>("#grid .row.sel, #grid .tile, #grid .row");
    const fallback = document.querySelector<HTMLElement>(".view.on button, .view.on input, header button");
    (homeCard ?? firstGame ?? fallback)?.focus();
    return;
  }
  const start = active.getBoundingClientRect();
  const cx = start.left + start.width / 2;
  const cy = start.top + start.height / 2;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const element of nodes) {
    if (element === active) continue;
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const along = (x - cx) * dx + (y - cy) * dy;
    if (along <= 4) continue;
    if (dx > 0 && rect.left < start.right - 4) continue;
    if (dx < 0 && rect.right > start.left + 4) continue;
    if (dy > 0 && rect.top < start.bottom - 4) continue;
    if (dy < 0 && rect.bottom > start.top + 4) continue;
    const perp = Math.abs((x - cx) * dy) + Math.abs((y - cy) * dx);
    const score = along + perp * 2.2;
    if (score < bestScore) {
      bestScore = score;
      best = element;
    }
  }
  if (!best) return;
  best.focus({ preventScroll: true });
  best.scrollIntoView({ block: "nearest", inline: best.closest(".rail") ? "center" : "nearest", behavior: "smooth" });
}

const PAD: Record<number, string> = {
  12: "ArrowUp",
  13: "ArrowDown",
  14: "ArrowLeft",
  15: "ArrowRight",
  0: "Enter",
  1: "Escape",
  3: "y",
  4: "PageUp",
  5: "PageDown",
};

export function startGamepad(onChange: (connected: boolean) => void): () => void {
  const prev: Record<number, number> = {};
  const times: Record<number, number> = {};
  let axisAt = 0;
  let last = false;
  let frame = 0;
  const poll = () => {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter((pad): pad is Gamepad => Boolean(pad)) : [];
    if (Boolean(pads.length) !== last) {
      last = pads.length > 0;
      onChange(last);
    }
    const pad = pads[0];
    if (pad) {
      const now = performance.now();
      for (const [indexText, key] of Object.entries(PAD)) {
        const index = Number(indexText);
        const pressed = Boolean(pad.buttons[index]?.pressed);
        const repeat = key.startsWith("Arrow") && prev[index] && now - (times[index] ?? 0) > (prev[index] === 1 ? 380 : 130);
        if (pressed && (!prev[index] || repeat)) {
          times[index] = now;
          prev[index] = prev[index] ? 2 : 1;
          document.body.classList.add("kbd");
          document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
        } else if (!pressed) {
          prev[index] = 0;
        }
      }
      const axisX = pad.axes[0] ?? 0;
      const axisY = pad.axes[1] ?? 0;
      const dir = Math.abs(axisX) > 0.6 ? (axisX > 0 ? "ArrowRight" : "ArrowLeft") : Math.abs(axisY) > 0.6 ? (axisY > 0 ? "ArrowDown" : "ArrowUp") : null;
      if (dir && now - axisAt > 180) {
        axisAt = now;
        document.body.classList.add("kbd");
        document.dispatchEvent(new KeyboardEvent("keydown", { key: dir, bubbles: true }));
      }
      if (!dir) axisAt = 0;
    }
    frame = requestAnimationFrame(poll);
  };
  frame = requestAnimationFrame(poll);
  return () => cancelAnimationFrame(frame);
}
