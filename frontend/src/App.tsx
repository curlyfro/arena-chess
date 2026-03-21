import { useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GamePage } from "@/components/layout/GamePage";
import { PuzzlePage } from "@/components/layout/PuzzlePage";
import { ProfilePage } from "@/components/layout/ProfilePage";
import { useGameStore } from "@/stores/game-store";

type Page = "game" | "puzzles" | "profile";

export default function App() {
  const resetGame = useGameStore((s) => s.resetGame);
  const [page, setPage] = useState<Page>("game");

  return (
    <ErrorBoundary onReset={resetGame}>
      {page === "game" && (
        <GamePage
          onNavigatePuzzles={() => setPage("puzzles")}
          onNavigateProfile={() => setPage("profile")}
        />
      )}
      {page === "puzzles" && (
        <PuzzlePage onBack={() => setPage("game")} />
      )}
      {page === "profile" && (
        <ProfilePage onBack={() => setPage("game")} />
      )}
    </ErrorBoundary>
  );
}
