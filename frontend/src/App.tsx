import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GamePage } from "@/components/layout/GamePage";
import { PuzzlePage } from "@/components/layout/PuzzlePage";
import { ProfilePage } from "@/components/layout/ProfilePage";
import { ReviewPage } from "@/components/layout/ReviewPage";
import { LeaderboardPage } from "@/components/layout/LeaderboardPage";
import { AchievementToast } from "@/components/ui/AchievementToast";
import { useGameStore } from "@/stores/game-store";

export default function App() {
  const resetGame = useGameStore((s) => s.resetGame);

  return (
    <BrowserRouter>
      <ErrorBoundary onReset={resetGame}>
        <Routes>
          <Route path="/" element={<GamePage />} />
          <Route path="/puzzles" element={<PuzzlePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/game/:id" element={<ReviewPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <AchievementToast />
      </ErrorBoundary>
    </BrowserRouter>
  );
}
