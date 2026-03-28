export function RatingCard({
  label,
  rating,
  trend,
}: {
  readonly label: string;
  readonly rating: number;
  readonly trend?: "up" | "down" | "flat";
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
    </div>
  );
}
