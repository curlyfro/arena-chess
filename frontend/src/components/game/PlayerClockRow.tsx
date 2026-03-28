import { memo } from "react";
import type { PieceColor, PieceSet, AnnotatedMove } from "@/types/chess";
import { AI_NAME_MAP } from "@/constants/engine-levels";
import { CircularClock } from "./CircularClock";
import { CapturedPieces } from "./CapturedPieces";
import { PlayerAvatar } from "./PlayerAvatar";
import { LevelBadge } from "@/components/ui/LevelBadge";

interface PlayerClockRowProps {
  readonly color: PieceColor;
  readonly isPlayer: boolean;
  readonly playerName: string;
  readonly aiLabel: string;
  readonly aiLevel?: number;
  readonly aiElo?: number;
  readonly playerRating?: number;
  readonly avatarId?: string | null;
  readonly avatarImage?: string | null;
  readonly isAiThinking: boolean;
  readonly history: readonly AnnotatedMove[];
  readonly pieceSet: PieceSet;
  readonly timeMsRef: React.RefObject<number>;
  readonly timeMs: number;
  readonly initialMs: number;
  readonly isClockActive: boolean;
}

export const PlayerClockRow = memo(function PlayerClockRow({
  color,
  isPlayer,
  playerName,
  aiLabel,
  aiLevel,
  aiElo,
  playerRating,
  avatarId,
  avatarImage,
  isAiThinking,
  history,
  pieceSet,
  timeMsRef,
  timeMs,
  initialMs,
  isClockActive,
}: PlayerClockRowProps) {
  const aiName = aiLevel != null ? AI_NAME_MAP.get(aiLevel) ?? aiLabel : aiLabel;

  return (
    <div className="flex items-center gap-4">
      {/* Avatar */}
      <PlayerAvatar
        type={isPlayer ? "player" : "ai"}
        name={isPlayer ? playerName : aiName}
        aiLevel={aiLevel}
        avatarId={isPlayer ? avatarId : undefined}
        avatarImage={isPlayer ? avatarImage : undefined}
        size={80}
      />

      {/* Name + info */}
      <div className="min-w-0 flex-shrink">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-foreground truncate max-w-[180px]">
            {isPlayer ? playerName : aiName}
          </span>
          {!isPlayer && isAiThinking && (
            <span className="animate-pulse text-base text-muted-foreground">thinking...</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-base text-muted-foreground">
          {isPlayer ? (
            <>
              <LevelBadge size="lg" />
              {playerRating != null && (
                <span className="font-mono text-base font-semibold text-foreground">{playerRating}</span>
              )}
            </>
          ) : (
            <span className="font-mono text-base font-semibold">{aiElo ?? "?"}</span>
          )}
        </div>
      </div>

      {/* Captured pieces — fills remaining space */}
      <div className="flex-1 min-w-0 flex justify-center">
        <CapturedPieces history={history} color={color} pieceSet={pieceSet} />
      </div>

      {/* Circular clock */}
      <CircularClock
        color={color}
        timeMsRef={timeMsRef}
        timeMs={timeMs}
        initialMs={initialMs}
        isActive={isClockActive}
        size={110}
      />
    </div>
  );
});
