import { useMemo } from "react";
import { useGameStore } from "@/stores/game-store";
import { BOARD_THEMES } from "@/constants/board-themes";
import type { BoardTheme, PieceSet } from "@/types/chess";

interface BoardPreferences {
  readonly theme: BoardTheme;
  readonly pieceSet: PieceSet;
  readonly showCoordinates: boolean;
  readonly showEvalBar: boolean;
}

export function useBoardPreferences(): BoardPreferences {
  const boardThemeId = useGameStore((s) => s.boardThemeId);
  const pieceSet = useGameStore((s) => s.pieceSet);
  const showCoordinates = useGameStore((s) => s.showCoordinates);
  const showEvalBar = useGameStore((s) => s.showEvalBar);

  const theme = useMemo(
    () => BOARD_THEMES.find((t) => t.id === boardThemeId) ?? BOARD_THEMES[1],
    [boardThemeId],
  );

  return { theme, pieceSet, showCoordinates, showEvalBar };
}
