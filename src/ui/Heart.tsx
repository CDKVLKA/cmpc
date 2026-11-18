export function HeartIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="heart-icon">
      <path
        d="M12 20.2s-6.8-4.2-6.8-8.7A3.7 3.7 0 0 1 12 8.2a3.7 3.7 0 0 1 6.8 3.3c0 4.5-6.8 8.7-6.8 8.7z"
        fill={on ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
