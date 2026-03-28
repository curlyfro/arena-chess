import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useNavigate } from "react-router";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useGameStore } from "@/stores/game-store";
import { BOARD_THEMES } from "@/constants/board-themes";

interface OnboardingOverlayProps {
  readonly onNewGame: () => void;
}

export function OnboardingOverlay({ onNewGame }: OnboardingOverlayProps) {
  const hasCompleted = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const complete = useOnboardingStore((s) => s.completeOnboarding);
  const setBoardThemeId = useGameStore((s) => s.setBoardThemeId);
  const boardThemeId = useGameStore((s) => s.boardThemeId);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  if (hasCompleted) return null;

  const handleFinish = () => {
    complete();
  };

  return (
    <Dialog.Root open onOpenChange={() => { /* prevent close via overlay */ }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background p-6 shadow-xl ring-1 ring-border">
          {step === 0 && (
            <div className="text-center space-y-4">
              <div className="text-5xl">&#x265A;</div>
              <Dialog.Title className="text-2xl font-bold text-foreground">
                Welcome to ChessArena
              </Dialog.Title>
              <p className="text-sm text-muted-foreground">
                Play against AI opponents, solve puzzles, learn openings, and track your progress as you improve.
              </p>
              <button
                onClick={() => setStep(1)}
                className="w-full rounded-lg bg-accent px-4 py-3 text-lg font-bold text-accent-foreground hover:bg-accent/80"
              >
                Get Started
              </button>
              <button
                onClick={handleFinish}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Skip
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Dialog.Title className="text-xl font-bold text-foreground text-center">
                How would you like to start?
              </Dialog.Title>
              <div className="grid gap-3">
                <button
                  onClick={() => { handleFinish(); navigate("/tutorials"); }}
                  className="rounded-lg bg-muted p-4 text-left hover:bg-border transition-colors"
                >
                  <div className="text-lg font-semibold text-foreground">&#x265D; Learn the Basics</div>
                  <div className="text-sm text-muted-foreground">Interactive tutorials to build your foundation</div>
                </button>
                <button
                  onClick={() => { handleFinish(); onNewGame(); }}
                  className="rounded-lg bg-muted p-4 text-left hover:bg-border transition-colors"
                >
                  <div className="text-lg font-semibold text-foreground">&#x2694; Jump Into a Game</div>
                  <div className="text-sm text-muted-foreground">Play against an AI opponent right away</div>
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="rounded-lg bg-muted p-4 text-left hover:bg-border transition-colors"
                >
                  <div className="text-lg font-semibold text-foreground">&#x1F3A8; Pick Your Board Theme</div>
                  <div className="text-sm text-muted-foreground">Customize the look before playing</div>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Dialog.Title className="text-xl font-bold text-foreground text-center">
                Pick a Board Theme
              </Dialog.Title>
              <div className="grid grid-cols-2 gap-2">
                {BOARD_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setBoardThemeId(theme.id)}
                    className={`rounded-lg p-2 text-center text-sm transition-colors ${
                      boardThemeId === theme.id
                        ? "ring-2 ring-accent bg-muted"
                        : "bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <div className="mx-auto mb-1.5 grid h-12 w-12 grid-cols-2 grid-rows-2 overflow-hidden rounded">
                      <div style={{ backgroundColor: theme.lightSquare }} />
                      <div style={{ backgroundColor: theme.darkSquare }} />
                      <div style={{ backgroundColor: theme.darkSquare }} />
                      <div style={{ backgroundColor: theme.lightSquare }} />
                    </div>
                    <div className="text-xs text-foreground">{theme.name}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={handleFinish}
                className="w-full rounded-lg bg-accent px-4 py-3 text-lg font-bold text-accent-foreground hover:bg-accent/80"
              >
                Start Playing
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
