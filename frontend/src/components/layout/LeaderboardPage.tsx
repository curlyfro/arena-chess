import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuthStore } from "@/stores/auth-store";
import { leaderboardApi, type LeaderboardEntry } from "@/lib/api";
import { TIME_CONTROL_LABELS, TITLE_COLORS, formatTitle, type TimeControl } from "@/constants/chess-labels";

export function LeaderboardPage() {
  const user = useAuthStore((s) => s.user);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [selectedTc, setSelectedTc] = useState<TimeControl>("blitz");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    leaderboardApi
      .getTop(selectedTc)
      .then((res) => setEntries(res.data))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [selectedTc]);

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background p-4">
      <div className="mb-4 flex w-full max-w-3xl items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">♚ Leaderboard</h1>
        <Link
          to="/"
          className="rounded bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-border"
        >
          Back to Game
        </Link>
      </div>

      <div className="w-full max-w-3xl space-y-4">
        {/* Time control tabs */}
        <div className="flex gap-1">
          {(["bullet", "blitz", "rapid"] as const).map((tc) => (
            <button
              key={tc}
              onClick={() => setSelectedTc(tc)}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                selectedTc === tc
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground hover:bg-border"
              }`}
            >
              {TIME_CONTROL_LABELS[tc]}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-muted-foreground animate-pulse text-center py-8">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="rounded-lg bg-muted p-8 text-center text-sm text-muted-foreground">
            No players found for {TIME_CONTROL_LABELS[selectedTc]}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-muted">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3 text-right">Rating</th>
                  <th className="px-4 py-3 text-right">Games</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const isCurrentUser = user?.playerId === entry.playerId;
                  return (
                    <tr
                      key={entry.playerId}
                      className={`border-b border-border/50 last:border-0 ${
                        isCurrentUser ? "bg-accent/15" : "hover:bg-border/30"
                      }`}
                    >
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">
                        {entry.rank}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          to={`/profile${isCurrentUser ? "" : `?id=${entry.playerId}`}`}
                          className={`font-medium hover:underline ${
                            isCurrentUser ? "text-accent" : "text-foreground"
                          }`}
                        >
                          {entry.username}
                          {isCurrentUser && (
                            <span className="ml-1.5 text-xs text-accent">(you)</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        {entry.title && entry.title !== "Beginner" ? (
                          <span className={`text-xs font-medium ${TITLE_COLORS[entry.title] ?? "text-muted-foreground"}`}>
                            {formatTitle(entry.title)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">
                        {entry.rating}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                        {entry.gamesPlayed}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
