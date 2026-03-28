import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { playerApi, type GameSummary } from "@/lib/api";
import { AI_NAME_MAP } from "@/constants/engine-levels";
import { RatingCard } from "@/components/ui/RatingCard";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { PgnImportDialog } from "@/components/game/PgnImportDialog";
import { OnboardingOverlay } from "@/components/ui/OnboardingOverlay";
import { ChallengeCard } from "@/components/ui/ChallengeCard";
import { useGameStore } from "@/stores/game-store";
import { useChallengeStore } from "@/stores/challenge-store";
import { usePuzzleStore } from "@/stores/puzzle-store";
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
        <span className="text-muted-foreground">vs {AI_NAME_MAP.get(game.aiLevel) ?? `AI L${game.aiLevel}`}</span>
      </div>
      <span className={`font-mono text-sm ${eloColor}`}>
        {game.eloChange > 0 ? `+${game.eloChange}` : game.eloChange}
      </span>
    </Link>
  );
}

/** Compute rating trend from recent games */
function computeTrend(games: GameSummary[]): "up" | "down" | "flat" {
  if (games.length === 0) return "flat";
  const totalChange = games.reduce((sum, g) => sum + g.eloChange, 0);
  if (totalChange > 0) return "up";
  if (totalChange < 0) return "down";
  return "flat";
}

const NAV_ITEMS = [
  { to: "/tutorials", label: "Tutorials", icon: "\u265D" },
  { to: "/puzzles", label: "Puzzles", icon: "\u265F" },
  { to: "/openings", label: "Openings", icon: "\u265E" },
  { to: "/profile", label: "Profile", icon: "\u265A" },
  { to: "/leaderboard", label: "Leaderboard", icon: "\u265B" },
] as const;

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
  const [showPgnImport, setShowPgnImport] = useState(false);
  const navigate = useNavigate();
  const winStreak = useGameStore((s) => s.winStreak);
  const refreshChallenges = useChallengeStore((s) => s.refreshChallenges);
  const dailyChallenges = useChallengeStore((s) => s.dailyChallenges);
  const weeklyChallenges = useChallengeStore((s) => s.weeklyChallenges);
  const dailyCompletedDates = usePuzzleStore((s) => s.dailyCompletedDates);
  const getDailyStreak = usePuzzleStore((s) => s.getDailyStreak);
  const today = new Date().toISOString().slice(0, 10);
  const isDailyCompleted = dailyCompletedDates.includes(today);
  const dailyStreak = getDailyStreak();

  useEffect(() => { refreshChallenges(); }, [refreshChallenges]);

  useEffect(() => {
    if (!authUser) return;
    playerApi
      .getGames(authUser.playerId, 1, 3)
      .then((res) => setRecentGames(res.data.data))
      .catch(() => { /* non-critical — dashboard still usable without recent games */ });
  }, [authUser]);

  const trend = computeTrend(recentGames);

  return (
    <div className="w-full max-w-lg space-y-6">
      <OnboardingOverlay onNewGame={onNewGame} />

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

      {/* Welcome + Level */}
      {authUser && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Welcome back, <span className="text-foreground font-medium">{authUser.username}</span>
          </p>
          <LevelBadge showProgress />
        </div>
      )}

      {/* Play buttons */}
      <div className="flex gap-3">
        <button
          onClick={onQuickPlay}
          className="flex-1 rounded-lg bg-accent px-4 py-5 text-xl font-bold text-accent-foreground hover:bg-accent/80"
        >
          Quick Play
        </button>
        <button
          onClick={onNewGame}
          className="flex-1 rounded-lg bg-muted px-4 py-5 text-xl font-bold text-foreground ring-1 ring-border hover:bg-border"
        >
          New Game
        </button>
      </div>

      {/* Win streak */}
      {winStreak >= 2 && (
        <div className="flex items-center gap-2 rounded-lg bg-orange-500/10 px-4 py-2.5">
          <span className="text-lg">&#x1F525;</span>
          <span className="text-sm font-medium text-orange-400">
            {winStreak} game win streak!
          </span>
        </div>
      )}

      {/* Daily puzzle */}
      <div className="rounded-lg bg-muted p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-muted-foreground">Daily Puzzle</div>
          {dailyStreak > 1 && (
            <span className="text-xs text-success font-medium">{dailyStreak} day streak</span>
          )}
        </div>
        {isDailyCompleted ? (
          <p className="mt-1 text-sm text-success font-medium">Completed today!</p>
        ) : (
          <Link
            to="/puzzles"
            className="mt-2 inline-block rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent/80"
          >
            Solve today's puzzle
          </Link>
        )}
      </div>

      {/* Challenges */}
      {(dailyChallenges.length > 0 || weeklyChallenges.length > 0) && (
        <div className="rounded-lg bg-muted p-3 space-y-1.5">
          <h3 className="text-xs font-medium text-muted-foreground uppercase mb-1">Challenges</h3>
          {dailyChallenges.map((c) => (
            <ChallengeCard key={c.templateId} challenge={c} label="daily" />
          ))}
          {weeklyChallenges.map((c) => (
            <ChallengeCard key={c.templateId} challenge={c} label="weekly" />
          ))}
        </div>
      )}

      {/* Ratings */}
      {authProfile && (
        <div className="grid grid-cols-3 gap-3">
          <RatingCard label="Bullet" rating={authProfile.eloBullet} trend={trend} />
          <RatingCard label="Blitz" rating={authProfile.eloBlitz} trend={trend} />
          <RatingCard label="Rapid" rating={authProfile.eloRapid} trend={trend} />
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-lg bg-muted p-3 text-center hover:bg-border"
          >
            <div className="text-xl">{item.icon}</div>
            <div className="text-sm font-medium text-foreground">{item.label}</div>
          </Link>
        ))}
      </div>

      {/* Import PGN */}
      <button
        onClick={() => setShowPgnImport(true)}
        className="w-full rounded-lg bg-muted p-3 text-center text-sm font-medium text-muted-foreground hover:bg-border"
      >
        Import PGN
      </button>
      <PgnImportDialog
        open={showPgnImport}
        onClose={() => setShowPgnImport(false)}
        onImport={(pgn) => {
          setShowPgnImport(false);
          navigate("/game/imported", { state: { pgn } });
        }}
      />

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
