import { memo } from "react";
import type { PieceColor, PieceSet, AnnotatedMove } from "@/types/chess";
import { ClockPanel } from "./ClockPanel";
import { CapturedPieces } from "./CapturedPieces";

interface PlayerClockRowProps {
  readonly color: PieceColor;
  readonly isPlayer: boolean;
  readonly playerName: string;
  readonly aiLabel: string;
  readonly isAiThinking: boolean;
  readonly history: readonly AnnotatedMove[];
  readonly pieceSet: PieceSet;
  readonly timeMsRef: React.RefObject<number>;
  readonly timeMs: number;
  readonly isClockActive: boolean;
}

export const PlayerClockRow = memo(function PlayerClockRow({
  color,
  isPlayer,
  playerName,
  aiLabel,
  isAiThinking,
  history,
  pieceSet,
  timeMsRef,
  timeMs,
  isClockActive,
}: PlayerClockRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground truncate">
        {isPlayer ? playerName : aiLabel}
        {!isPlayer && isAiThinking && (
          <span className="ml-1 animate-pulse">♞</span>
        )}
      </span>
      <CapturedPieces history={history} color={color} pieceSet={pieceSet} />
      <div className="ml-auto">
        <ClockPanel
          color={color}
          timeMsRef={timeMsRef}
          timeMs={timeMs}
          isActive={isClockActive}
        />
      </div>
    </div>
  );
});
