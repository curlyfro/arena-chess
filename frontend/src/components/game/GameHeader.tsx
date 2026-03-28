import { Link } from "react-router";
import { useGameStore } from "@/stores/game-store";
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
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const setSoundEnabled = useGameStore((s) => s.setSoundEnabled);

  return (
    <div className="mb-4 flex w-full max-w-5xl items-center justify-between">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-lg font-bold text-foreground hover:text-accent transition-colors">
          &#x265A; ChessArena
        </Link>
        {hasSession && (
          <button
            onClick={onNewGame}
            className="rounded bg-muted px-3 py-1 text-sm font-medium text-muted-foreground hover:bg-border"
          >
            New Game
          </button>
        )}
        <Link
          to="/tutorials"
          className="rounded bg-muted px-3 py-1 text-sm font-medium text-muted-foreground hover:bg-border"
        >
          Tutorials
        </Link>
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
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="rounded bg-muted px-2 py-1 text-sm text-muted-foreground hover:bg-border"
          aria-label={soundEnabled ? "Mute sounds" : "Unmute sounds"}
          title={soundEnabled ? "Sound on" : "Sound off"}
        >
          {soundEnabled ? "\uD83D\uDD0A" : "\uD83D\uDD07"}
        </button>
        <button
          onClick={onOpenSettings}
          className="rounded bg-muted px-2 py-1 text-sm text-muted-foreground hover:bg-border"
          aria-label="Settings"
        >
          &#x2699;
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
