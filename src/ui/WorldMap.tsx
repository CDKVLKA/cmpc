import { ORIGIN_REGIONS, type OriginRegion } from "../lib/origin";

const SPOTS: Record<OriginRegion, { x: number; y: number }> = {
  Canada: { x: 180, y: 90 },
  USA: { x: 175, y: 145 },
  Brazil: { x: 250, y: 270 },
  UK: { x: 430, y: 105 },
  France: { x: 445, y: 130 },
  Spain: { x: 420, y: 150 },
  Germany: { x: 470, y: 120 },
  Netherlands: { x: 458, y: 112 },
  Italy: { x: 485, y: 145 },
  Sweden: { x: 490, y: 80 },
  Europe: { x: 510, y: 125 },
  Russia: { x: 620, y: 90 },
  China: { x: 700, y: 160 },
  Korea: { x: 760, y: 155 },
  Japan: { x: 800, y: 155 },
  Australia: { x: 780, y: 310 },
};

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
  const unknown = counts.Unknown ?? 0;
  return (
    <div className="world">
      <svg viewBox="0 0 920 420" role="img">
        <g className="land" aria-hidden="true">
          <path d="M70 70c40-30 120-40 180-10 30 16 70 10 90 40 18 28-10 50-30 70-40 36-90 20-140 28-50 8-90-20-110-60-12-24-8-48 10-68z" />
          <path d="M150 220c30-10 70 0 80 30 16 40 4 90-20 120-20 24-50 20-70 4-24-20-30-70-20-110 6-22 12-36 30-44z" />
          <path d="M400 70c30-16 80-10 100 16 16 20 8 40-8 54-28 22-70 16-96-4-18-14-16-48 4-66z" />
          <path d="M430 160c28-8 60 10 64 40 6 36-8 70-30 90-22 18-48 8-58-12-12-24-6-70 4-96 6-14 10-20 20-22z" />
          <path d="M540 60c80-24 180-10 250 30 40 24 70 20 90 50 10 16-20 28-40 24-70-14-150-6-220-20-40-8-70-20-90-46-12-16-8-28 10-38z" />
          <path d="M700 250c40-16 90-6 110 20 14 18 6 40-16 48-30 10-70 4-90-16-14-14-16-36-4-52z" />
        </g>
        {ORIGIN_REGIONS.map((id) => {
          const spot = SPOTS[id];
          const count = counts[id] ?? 0;
          const on = count > 0;
          return (
            <g key={id} className={on ? "spot on" : "spot"} transform={`translate(${spot.x} ${spot.y})`} onClick={() => on && onPick(id)}>
              <circle r={on ? 11 : 5} />
              {on ? <text y={-14}>{label(id)} · {count}</text> : null}
            </g>
          );
        })}
      </svg>
      <button type="button" className="unknown" onClick={() => unknown && onPick("Unknown")} disabled={!unknown}>
        {unknownLabel} · {unknown}
      </button>
    </div>
  );
}
