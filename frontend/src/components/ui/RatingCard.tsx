function Sparkline({ history }: { readonly history: number[] }) {
  const first = history[0];
  const last = history[history.length - 1];
  const diff = last - first;
  const color =
    diff > 0
      ? "var(--color-success)"
      : diff < 0
        ? "var(--color-destructive)"
        : "var(--color-muted-foreground)";
  const badgeClass =
    diff > 0
      ? "text-success"
      : diff < 0
        ? "text-destructive"
        : "text-muted-foreground";

  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;

  const points = history
    .map((v, i) => {
      const x = (i / (history.length - 1)) * 60;
      const y = 20 - (((v - min) / range) * 16 + 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="flex items-center justify-center gap-1.5 mt-1">
      <svg width="60" height="20" viewBox="0 0 60 20" className="shrink-0">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={`text-[10px] font-bold ${badgeClass}`}>
        {diff > 0 ? `+${diff}` : diff}
      </span>
    </div>
  );
}

export function RatingCard({
  label,
  rating,
  trend,
  history,
}: {
  readonly label: string;
  readonly rating: number;
  readonly trend?: "up" | "down" | "flat";
  readonly history?: number[];
}) {
  const trendIcon = trend === "up" ? "▲" : trend === "down" ? "▼" : null;
  const trendColor = trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "";

  return (
    <div className="rounded-lg bg-muted p-3 text-center">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div className="flex items-center justify-center gap-1">
        <span className="text-2xl font-bold text-foreground">{rating}</span>
        {trendIcon && (
          <span className={`text-xs font-bold ${trendColor}`}>{trendIcon}</span>
        )}
      </div>
      {history && history.length >= 2 && <Sparkline history={history} />}
    </div>
  );
}
