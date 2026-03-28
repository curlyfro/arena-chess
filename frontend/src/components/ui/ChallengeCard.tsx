import type { ActiveChallenge } from "@/stores/challenge-store";

interface ChallengeCardProps {
  readonly challenge: ActiveChallenge;
  readonly label?: string;
}

export function ChallengeCard({ challenge, label }: ChallengeCardProps) {
  const pct = Math.min(100, (challenge.progress / challenge.target) * 100);

  return (
    <div className="flex items-center gap-3 rounded-lg bg-background px-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground truncate">{challenge.description}</span>
          {label && (
            <span className="shrink-0 text-[10px] text-muted-foreground uppercase">{label}</span>
          )}
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className={`h-full rounded-full transition-all ${challenge.completed ? "bg-success" : "bg-accent"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="shrink-0 text-right">
        {challenge.completed ? (
          <span className="text-xs font-medium text-success">+{challenge.xpReward} XP</span>
        ) : (
          <span className="text-xs font-mono text-muted-foreground">
            {challenge.progress}/{challenge.target}
          </span>
        )}
      </div>
    </div>
  );
}
