import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GamePage } from "@/components/layout/GamePage";
import { useGameStore } from "@/stores/game-store";

export default function App() {
  const resetGame = useGameStore((s) => s.resetGame);

  return (
    <ErrorBoundary onReset={resetGame}>
      <GamePage />
    </ErrorBoundary>
  );
}
