import { Link } from "react-router";
import type { PlayerProfile } from "@/lib/api";

interface GameHeaderProps {
  readonly hasSession: boolean;
  readonly authUser: { username: string } | null;
  readonly authProfile: PlayerProfile | null;
  readonly onNewGame: () => void;
  readonly onSignIn: () => void;
  readonly onSignOut: () => void;
  readonly onOpenSettings: () => void;
}

export function GameHeader({
  hasSession,
  authUser,
  authProfile,
  onNewGame,
  onSignIn,
  onSignOut,
  onOpenSettings,
}: GameHeaderProps) {
  return (
    <div className="mb-4 flex w-full max-w-5xl items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-foreground">♚ ChessArena</h1>
        {hasSession && (
          <button
            onClick={onNewGame}
            className="rounded bg-muted px-3 py-1 text-sm font-medium text-muted-foreground hover:bg-border"
          >
            New Game
          </button>
        )}
        <Link
          to="/puzzles"
          className="rounded bg-muted px-3 py-1 text-sm font-medium text-muted-foreground hover:bg-border"
        >
          Puzzles
        </Link>
        <Link
          to="/leaderboard"
          className="rounded bg-muted px-3 py-1 text-sm font-medium text-muted-foreground hover:bg-border"
        >
          Leaderboard
        </Link>
        <button
          onClick={onOpenSettings}
          className="rounded bg-muted px-2 py-1 text-sm text-muted-foreground hover:bg-border"
          aria-label="Settings"
        >
          ⚙
        </button>
      </div>
      <div className="flex items-center gap-3">
        {authUser ? (
          <>
            <Link
              to="/profile"
              className="text-sm text-foreground font-medium hover:underline"
            >
              {authUser.username}
            </Link>
            {authProfile && (
              <>
                <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                  ⚡{authProfile.eloBlitz} 🕐{authProfile.eloRapid} 🔵{authProfile.eloBullet}
                </span>
                <span className="text-xs text-muted-foreground">
                  {authProfile.stats.totalGames}G {authProfile.stats.wins}W {authProfile.stats.losses}L
                </span>
              </>
            )}
            <button
              onClick={onSignOut}
              className="rounded bg-muted px-3 py-1 text-sm text-muted-foreground hover:bg-border"
            >
              Sign Out
            </button>
          </>
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
  );
}
