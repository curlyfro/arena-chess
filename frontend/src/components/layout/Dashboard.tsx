import { useEffect, useState } from "react";
import { Link } from "react-router";
import { playerApi, type GameSummary } from "@/lib/api";
import { RatingCard } from "@/components/ui/RatingCard";
import type { UserProfile, PlayerProfile } from "@/lib/api";

interface DashboardProps {
  readonly authUser: UserProfile | null;
  readonly authProfile: PlayerProfile | null;
  readonly onQuickPlay: () => void;
  readonly onNewGame: () => void;
  readonly onSignIn: () => void;
  readonly onSignOut: () => void;
  readonly onOpenSettings: () => void;
}

function RecentGameRow({ game }: { readonly game: GameSummary }) {
  const resultColor =
    game.result === "Win"
      ? "text-success"
      : game.result === "Loss"
        ? "text-destructive"
        : "text-muted-foreground";

  const eloColor =
    game.eloChange > 0
      ? "text-success"
      : game.eloChange < 0
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <Link
      to={`/game/${game.id}`}
      className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted/50"
    >
      <div className="flex items-center gap-3">
        <span className={`w-10 font-medium ${resultColor}`}>{game.result}</span>
        <span className="text-muted-foreground">vs AI L{game.aiLevel}</span>
      </div>
      <span className={`font-mono text-sm ${eloColor}`}>
        {game.eloChange > 0 ? `+${game.eloChange}` : game.eloChange}
      </span>
    </Link>
  );
}

export function Dashboard({
  authUser,
  authProfile,
  onQuickPlay,
  onNewGame,
  onSignIn,
  onSignOut,
  onOpenSettings,
}: DashboardProps) {
  const [recentGames, setRecentGames] = useState<GameSummary[]>([]);

  useEffect(() => {
    if (!authUser) return;
    playerApi
      .getGames(authUser.playerId, 1, 3)
      .then((res) => setRecentGames(res.data.data))
      .catch(() => { /* non-critical — dashboard still usable without recent games */ });
  }, [authUser]);

  return (
    <div className="w-full max-w-lg space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">♚ ChessArena</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="rounded bg-muted px-3 py-1.5 text-sm text-muted-foreground hover:bg-border"
          >
            Settings
          </button>
          {authUser ? (
            <button
              onClick={onSignOut}
              className="rounded bg-muted px-3 py-1.5 text-sm text-muted-foreground hover:bg-border"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={onSignIn}
              className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent/80"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Welcome */}
      {authUser && (
        <p className="text-sm text-muted-foreground">
          Welcome back, <span className="text-foreground font-medium">{authUser.username}</span>
        </p>
      )}

      {/* Play buttons */}
      <div className="flex gap-3">
        <button
          onClick={onQuickPlay}
          className="flex-1 rounded-lg bg-accent px-4 py-4 text-lg font-bold text-accent-foreground hover:bg-accent/80"
        >
          Quick Play
        </button>
        <button
          onClick={onNewGame}
          className="flex-1 rounded-lg bg-muted px-4 py-4 text-lg font-bold text-foreground ring-1 ring-border hover:bg-border"
        >
          New Game
        </button>
      </div>

      {/* Ratings */}
      {authProfile && (
        <div className="grid grid-cols-3 gap-3">
          <RatingCard label="Bullet" rating={authProfile.eloBullet} />
          <RatingCard label="Blitz" rating={authProfile.eloBlitz} />
          <RatingCard label="Rapid" rating={authProfile.eloRapid} />
        </div>
      )}

      {/* Recent games */}
      {recentGames.length > 0 && (
        <div className="rounded-lg bg-muted p-3">
          <h3 className="mb-2 text-xs font-medium text-muted-foreground uppercase">
            Recent Games
          </h3>
          <div className="space-y-1">
            {recentGames.map((g) => (
              <RecentGameRow key={g.id} game={g} />
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          to="/puzzles"
          className="rounded-lg bg-muted p-3 text-center text-sm font-medium text-foreground hover:bg-border"
        >
          Puzzles
        </Link>
        <Link
          to="/profile"
          className="rounded-lg bg-muted p-3 text-center text-sm font-medium text-foreground hover:bg-border"
        >
          Profile
        </Link>
        <Link
          to="/leaderboard"
          className="rounded-lg bg-muted p-3 text-center text-sm font-medium text-foreground hover:bg-border"
        >
          Leaderboard
        </Link>
      </div>

      {/* Guest prompt */}
      {!authUser && (
        <div className="rounded-lg bg-muted/50 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Sign in to track your rating and compete on the leaderboard
          </p>
        </div>
      )}
    </div>
  );
}
