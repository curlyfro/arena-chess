import { useRef, useEffect } from "react";
import type { ActiveChallenge } from "@/stores/challenge-store";

interface ChallengeCardProps {
  readonly challenge: ActiveChallenge;
  readonly label?: string;
}

export function ChallengeCard({ challenge, label }: ChallengeCardProps) {
  const pct = Math.min(100, (challenge.progress / challenge.target) * 100);
  const wasCompleted = useRef(challenge.completed);
  const justCompleted = !wasCompleted.current && challenge.completed;

  useEffect(() => {
    wasCompleted.current = challenge.completed;
  });

  return (
    <div className="flex items-center gap-3 rounded-lg bg-background px-3 py-2 transition-colors duration-300">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground truncate">{challenge.description}</span>
          {label && (
            <span className="shrink-0 text-[10px] text-muted-foreground uppercase">{label}</span>
          )}
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${challenge.completed ? "bg-success" : "bg-accent"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="shrink-0 text-right">
        {challenge.completed ? (
          <span className={`text-xs font-medium text-success inline-flex items-center gap-1${justCompleted ? " animate-in zoom-in-50 duration-300" : ""}`}>
            {justCompleted && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
              </svg>
            )}
            +{challenge.xpReward} XP
          </span>
        ) : (
          <span className="text-xs font-mono text-muted-foreground">
            {challenge.progress}/{challenge.target}
          </span>
        )}
      </div>
    </div>
  );
}
