import { memo, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import {
  playerApi,
  type PlayerProfile,
  type GameSummary,
  type RatingHistoryEntry,
} from "@/lib/api";
import { Link } from "react-router";
import { TIME_CONTROL_LABELS, TITLE_COLORS, type TimeControl } from "@/constants/chess-labels";
import { RatingCard } from "@/components/ui/RatingCard";
import { useAchievementStore } from "@/stores/achievement-store";
import { ACHIEVEMENTS } from "@/constants/achievements";

const RatingChart = memo(function RatingChart({ history }: { readonly history: readonly RatingHistoryEntry[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (history.length < 2) {
    return <div className="text-sm text-muted-foreground text-center py-4">Not enough games for a chart</div>;
  }

  const ratings = history.map((h) => h.rating);
  const min = ratings.reduce((a, b) => Math.min(a, b), Infinity);
  const max = ratings.reduce((a, b) => Math.max(a, b), -Infinity);
  const range = Math.max(max - min, 50);
  const width = 400;
  const height = 140;
  const paddingLeft = 35;
  const paddingRight = 8;
  const paddingTop = 8;
  const paddingBottom = 20;
  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const getX = (i: number) => paddingLeft + (i / (history.length - 1)) * chartW;
  const getY = (rating: number) => paddingTop + chartH - ((rating - min + 25) / (range + 50)) * chartH;

  const points = history.map((h, i) => `${getX(i)},${getY(h.rating)}`).join(" ");
  const fillPoints = `${getX(0)},${paddingTop + chartH} ${points} ${getX(history.length - 1)},${paddingTop + chartH}`;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width * width;
    const nearestIndex = Math.max(0, Math.min(history.length - 1,
      Math.round(((relX - paddingLeft) / chartW) * (history.length - 1))));
    setHoveredIndex((prev) => prev === nearestIndex ? prev : nearestIndex);
  };

  // Y-axis ticks
  const yTicks: number[] = [];
  const step = range <= 100 ? 25 : range <= 200 ? 50 : 100;
  const tickMin = Math.ceil(min / step) * step;
  for (let v = tickMin; v <= max; v += step) {
    yTicks.push(v);
  }

  // X-axis dates
  const firstDate = new Date(history[0].recordedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const lastDate = new Date(history[history.length - 1].recordedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const hovered = hoveredIndex != null ? history[hoveredIndex] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-36"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id="ratingFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.3} className="text-accent" />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0.02} className="text-accent" />
          </linearGradient>
        </defs>

        {/* Y-axis ticks */}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={paddingLeft} y1={getY(v)} x2={width - paddingRight} y2={getY(v)} stroke="currentColor" strokeOpacity={0.1} className="text-border" />
            <text x={paddingLeft - 4} y={getY(v) + 3} textAnchor="end" className="fill-muted-foreground text-[9px]">{v}</text>
          </g>
        ))}

        {/* X-axis dates */}
        <text x={paddingLeft} y={height - 3} className="fill-muted-foreground text-[9px]">{firstDate}</text>
        <text x={width - paddingRight} y={height - 3} textAnchor="end" className="fill-muted-foreground text-[9px]">{lastDate}</text>

        {/* Area fill */}
        <polygon points={fillPoints} fill="url(#ratingFill)" />

        {/* Line */}
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2} className="text-accent" />

        {/* Hover point */}
        {hoveredIndex != null && (
          <>
            <line x1={getX(hoveredIndex)} y1={paddingTop} x2={getX(hoveredIndex)} y2={paddingTop + chartH} stroke="currentColor" strokeOpacity={0.2} strokeDasharray="3,3" className="text-foreground" />
            <circle cx={getX(hoveredIndex)} cy={getY(history[hoveredIndex].rating)} r={4} fill="currentColor" className="text-accent" />
          </>
        )}
      </svg>

      {/* Tooltip */}
      {hovered && hoveredIndex != null && (
        <div
          className="absolute top-0 pointer-events-none rounded bg-muted px-2 py-1 text-xs shadow ring-1 ring-border"
          style={{
            left: `${(getX(hoveredIndex) / width) * 100}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-bold text-foreground">{hovered.rating}</div>
          <div className="text-muted-foreground">
            {new Date(hovered.recordedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </div>
        </div>
      )}
    </div>
  );
});

function GameRow({ game }: { readonly game: GameSummary }) {
  const resultColor = game.result === "Win"
    ? "text-success"
    : game.result === "Loss"
      ? "text-destructive"
      : "text-muted-foreground";

  const eloColor = game.eloChange > 0
    ? "text-success"
    : game.eloChange < 0
      ? "text-destructive"
      : "text-muted-foreground";

  const date = new Date(game.playedAt);
  const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <Link
      to={`/game/${game.id}`}
      className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted/50 cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <span className={`w-10 font-medium ${resultColor}`}>{game.result}</span>
        <span className="text-muted-foreground">vs AI L{game.aiLevel}</span>
        <span className="text-xs text-muted-foreground">{game.timeControl}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className={`font-mono text-sm ${eloColor}`}>
          {game.eloChange > 0 ? `+${game.eloChange}` : game.eloChange}
        </span>
        <span className="text-xs text-muted-foreground w-14 text-right">{dateStr}</span>
      </div>
    </Link>
  );
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const unlockedIds = useAchievementStore((s) => s.unlockedIds);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [games, setGames] = useState<GameSummary[]>([]);
  const [ratingHistory, setRatingHistory] = useState<RatingHistoryEntry[]>([]);
  const [selectedTc, setSelectedTc] = useState<TimeControl>("blitz");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile + games (independent of time control selection)
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    Promise.all([
      playerApi.getProfile(user.playerId),
      playerApi.getGames(user.playerId),
    ])
      .then(([profileRes, gamesRes]) => {
        setProfile(profileRes.data);
        setGames(gamesRes.data.data);
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [user]);

  // Fetch rating history (depends on selected time control)
  useEffect(() => {
    if (!user) return;
    playerApi
      .getRatingHistory(user.playerId, selectedTc)
      .then((res) => setRatingHistory(res.data))
      .catch(() => {});
  }, [user, selectedTc]);

  const authProfile = useAuthStore((s) => s.playerProfile);
  const displayProfile = profile ?? authProfile;

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">Sign in to view your profile</p>
        <Link to="/" className="mt-4 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background p-4">
      <div className="mb-4 flex w-full max-w-3xl items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">♚ Profile</h1>
        <Link
          to="/"
          className="rounded bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-border"
        >
          Back to Game
        </Link>
      </div>

      {error && (
        <div className="mb-4 w-full max-w-3xl rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !displayProfile ? (
        <div className="w-full max-w-3xl space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="h-20 animate-pulse rounded-lg bg-muted" />
            <div className="h-20 animate-pulse rounded-lg bg-muted" />
            <div className="h-20 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : displayProfile ? (
        <div className="w-full max-w-3xl space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-2xl font-bold text-foreground">
              {(displayProfile.username[0] ?? "?").toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{displayProfile.username}</h2>
              {displayProfile.title && displayProfile.title !== "Beginner" && (
                <span className={`text-sm font-medium ${TITLE_COLORS[displayProfile.title] ?? "text-muted-foreground"}`}>
                  {displayProfile.title}
                </span>
              )}
            </div>
          </div>

          {/* Ratings */}
          <div className="grid grid-cols-3 gap-3">
            <RatingCard label="Bullet" rating={displayProfile.eloBullet} />
            <RatingCard label="Blitz" rating={displayProfile.eloBlitz} />
            <RatingCard label="Rapid" rating={displayProfile.eloRapid} />
          </div>

          {/* Stats */}
          <div className="rounded-lg bg-muted p-4">
            <h3 className="mb-3 text-sm font-medium text-muted-foreground uppercase">Statistics</h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <div className="text-muted-foreground">Games</div>
                <div className="text-lg font-bold text-foreground">{displayProfile.stats.totalGames}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Wins</div>
                <div className="text-lg font-bold text-success">{displayProfile.stats.wins}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Losses</div>
                <div className="text-lg font-bold text-destructive">{displayProfile.stats.losses}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Draws</div>
                <div className="text-lg font-bold text-foreground">{displayProfile.stats.draws}</div>
              </div>
            </div>
            {displayProfile.stats.totalGames > 0 && (
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-success"
                  style={{ width: `${displayProfile.stats.winRate}%` }}
                />
              </div>
            )}
          </div>

          {/* Achievements */}
          {unlockedIds.length > 0 && (
            <div className="rounded-lg bg-muted p-4">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground uppercase">
                Achievements ({unlockedIds.length}/{ACHIEVEMENTS.length})
              </h3>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {ACHIEVEMENTS.map((a) => {
                  const unlocked = unlockedIds.includes(a.id);
                  return (
                    <div
                      key={a.id}
                      className={`rounded-lg p-2 text-center ${
                        unlocked ? "bg-background" : "bg-border/30 opacity-40"
                      }`}
                      title={`${a.name}: ${a.description}`}
                    >
                      <div className="text-lg">{a.icon}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{a.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rating History Chart */}
          <div className="rounded-lg bg-muted p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground uppercase">Rating History</h3>
              <div className="flex gap-1">
                {(["bullet", "blitz", "rapid"] as const).map((tc) => (
                  <button
                    key={tc}
                    onClick={() => setSelectedTc(tc)}
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      selectedTc === tc
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-border"
                    }`}
                  >
                    {TIME_CONTROL_LABELS[tc]}
                  </button>
                ))}
              </div>
            </div>
            <RatingChart history={ratingHistory} />
          </div>

          {/* Game History */}
          <div className="rounded-lg bg-muted p-4">
            <h3 className="mb-3 text-sm font-medium text-muted-foreground uppercase">Recent Games</h3>
            {games.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">No games played yet</p>
            ) : (
              <div className="space-y-1">
                {games.map((g) => (
                  <GameRow key={g.id} game={g} />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-muted-foreground">Could not load profile</div>
      )}
    </div>
  );
}
