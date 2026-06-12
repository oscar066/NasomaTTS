export function ProgressRing({ percent }: { percent: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const color =
    percent === 100 ? "#22c55e" :
    percent > 0     ? "hsl(var(--primary))" :
                      "hsl(var(--muted-foreground))";

  return (
    <div className="relative flex items-center justify-center w-11 h-11 flex-shrink-0">
      <svg width="44" height="44" className="-rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
        <circle
          cx="22" cy="22" r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <span className="absolute text-[10px] font-bold leading-none" style={{ color }}>
        {percent === 100 ? "✓" : `${percent}%`}
      </span>
    </div>
  );
}
