import { useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GamePage } from "@/components/layout/GamePage";
import { PuzzlePage } from "@/components/layout/PuzzlePage";
import { useGameStore } from "@/stores/game-store";

type Page = "game" | "puzzles";

export default function App() {
  const resetGame = useGameStore((s) => s.resetGame);
  const [page, setPage] = useState<Page>("game");

  return (
    <ErrorBoundary onReset={resetGame}>
      {page === "game" ? (
        <GamePage onNavigatePuzzles={() => setPage("puzzles")} />
      ) : (
        <PuzzlePage onBack={() => setPage("game")} />
      )}
    </ErrorBoundary>
  );
}
