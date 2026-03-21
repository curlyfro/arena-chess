import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import {
  playerApi,
  type PlayerProfile,
  type GameSummary,
  type RatingHistoryEntry,
} from "@/lib/api";

interface ProfilePageProps {
  readonly onBack: () => void;
}

type TimeControl = "bullet" | "blitz" | "rapid";

const TIME_CONTROL_LABELS: Record<TimeControl, string> = {
  bullet: "Bullet",
  blitz: "Blitz",
  rapid: "Rapid",
};

const TITLE_COLORS: Record<string, string> = {
  Grandmaster: "text-red-400",
  Master: "text-orange-400",
  CandidateMaster: "text-yellow-400",
  Expert: "text-purple-400",
  Advanced: "text-blue-400",
  Intermediate: "text-teal-400",
  ClubPlayer: "text-green-400",
  Beginner: "text-muted-foreground",
};

function RatingCard({ label, rating }: { readonly label: string; readonly rating: number }) {
  return (
    <div className="rounded-lg bg-muted p-3 text-center">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div className="text-2xl font-bold text-foreground">{rating}</div>
    </div>
  );
}

function RatingChart({ history }: { readonly history: readonly RatingHistoryEntry[] }) {
  if (history.length < 2) {
    return <div className="text-sm text-muted-foreground text-center py-4">Not enough games for a chart</div>;
  }

  const ratings = history.map((h) => h.rating);
  const min = Math.min(...ratings);
  const max = Math.max(...ratings);
  const range = Math.max(max - min, 50);
  const width = 400;
  const height = 120;
  const padding = 4;

  const points = history
    .map((h, i) => {
      const x = padding + (i / (history.length - 1)) * (width - padding * 2);
      const y = height - padding - ((h.rating - min + 25) / (range + 50)) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="text-accent"
      />
      <text x={padding} y={12} className="fill-muted-foreground text-[10px]">{max}</text>
      <text x={padding} y={height - 2} className="fill-muted-foreground text-[10px]">{min}</text>
    </svg>
  );
}

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
    <div className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted/50">
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
    </div>
  );
}

export function ProfilePage({ onBack }: ProfilePageProps) {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [games, setGames] = useState<GameSummary[]>([]);
  const [ratingHistory, setRatingHistory] = useState<RatingHistoryEntry[]>([]);
  const [selectedTc, setSelectedTc] = useState<TimeControl>("blitz");
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [profileRes, gamesRes, historyRes] = await Promise.all([
        playerApi.getProfile(user.playerId),
        playerApi.getGames(user.playerId),
        playerApi.getRatingHistory(user.playerId, selectedTc),
      ]);
      setProfile(profileRes.data);
      setGames(gamesRes.data);
      setRatingHistory(historyRes.data);
    } catch {
      // API may not be running — show what we have from auth store
    }
    setLoading(false);
  }, [user, selectedTc]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const authProfile = useAuthStore((s) => s.playerProfile);
  const displayProfile = profile ?? authProfile;

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">Sign in to view your profile</p>
        <button onClick={onBack} className="mt-4 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background p-4">
      <div className="mb-4 flex w-full max-w-3xl items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">♚ Profile</h1>
        <button
          onClick={onBack}
          className="rounded bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-border"
        >
          Back to Game
        </button>
      </div>

      {loading && !displayProfile ? (
        <div className="text-muted-foreground animate-pulse">Loading...</div>
      ) : displayProfile ? (
        <div className="w-full max-w-3xl space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-2xl font-bold text-foreground">
              {displayProfile.username[0].toUpperCase()}
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
