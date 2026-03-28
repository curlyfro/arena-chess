import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { initAudio } from "@/lib/sounds";
import { useGameStore } from "@/stores/game-store";
import { CloseIcon } from "@/components/ui/CloseIcon";
import { ENGINE_LEVELS } from "@/constants/engine-levels";
import { TIME_CONTROLS, DEFAULT_TIME_CONTROL } from "@/constants/time-controls";
import type { PieceColor } from "@/types/chess";
import type { EngineLevel } from "@/types/engine";
import type { TimeControlPreset } from "@/types/clock";
import type { GameSession } from "@/types/game";

interface NewGameDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onStart: (session: GameSession) => void;
}

export function NewGameDialog({ open, onClose, onStart }: NewGameDialogProps) {
  const lastSettings = useGameStore((s) => s.lastGameSettings);
  const setLastGameSettings = useGameStore((s) => s.setLastGameSettings);

  const [selectedLevel, setSelectedLevel] = useState<EngineLevel>(
    lastSettings
      ? ENGINE_LEVELS[lastSettings.levelIndex] ?? ENGINE_LEVELS[4]
      : ENGINE_LEVELS[4],
  );
  const [selectedTimeControl, setSelectedTimeControl] =
    useState<TimeControlPreset>(
      lastSettings
        ? TIME_CONTROLS.find((tc) => tc.id === lastSettings.timeControlId) ?? DEFAULT_TIME_CONTROL
        : DEFAULT_TIME_CONTROL,
    );
  const [colorChoice, setColorChoice] = useState<"w" | "b" | "random">(
    lastSettings?.colorChoice ?? "random",
  );
  const [isRated, setIsRated] = useState(lastSettings?.isRated ?? true);

  const handleStart = () => {
    initAudio(); // Unlock AudioContext on user gesture

    setLastGameSettings({
      levelIndex: ENGINE_LEVELS.indexOf(selectedLevel),
      timeControlId: selectedTimeControl.id,
      colorChoice,
      isRated,
    });

    const playerColor: PieceColor =
      colorChoice === "random"
        ? Math.random() < 0.5
          ? "w"
          : "b"
        : colorChoice;

    onStart({
      playerColor,
      engineLevel: selectedLevel,
      timeControl: selectedTimeControl,
      isRated,
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background p-6 shadow-xl ring-1 ring-border">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-xl font-bold text-foreground">
              New Game
            </Dialog.Title>
            <Dialog.Close
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <CloseIcon />
            </Dialog.Close>
          </div>

          {/* Difficulty */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Difficulty
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ENGINE_LEVELS.map((level) => (
                <button
                  key={level.level}
                  onClick={() => setSelectedLevel(level)}
                  className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    selectedLevel.level === level.level
                      ? "bg-accent text-accent-foreground ring-2 ring-accent"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  <div className="font-semibold">
                    L{level.level} {level.label}
                  </div>
                  <div className="text-xs opacity-70">~{level.elo} Elo</div>
                </button>
              ))}
            </div>
          </div>

          {/* Time Control */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Time Control
            </label>
            <div className="flex gap-2">
              {TIME_CONTROLS.map((tc) => (
                <button
                  key={tc.id}
                  onClick={() => setSelectedTimeControl(tc)}
                  className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors ${
                    selectedTimeControl.id === tc.id
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  <div>{tc.label}</div>
                  <div className="text-xs capitalize opacity-70">
                    {tc.category}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Rated */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Mode
            </label>
            <div className="flex gap-2">
              {([
                { value: true, label: "Rated", desc: "Affects Elo" },
                { value: false, label: "Casual", desc: "No rating change" },
              ] as const).map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => setIsRated(opt.value)}
                  className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors ${
                    isRated === opt.value
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  <div>{opt.label}</div>
                  <div className="text-xs opacity-70">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Play as
            </label>
            <div className="flex gap-2">
              {(
                [
                  { value: "w", label: "White", icon: "♔" },
                  { value: "random", label: "Random", icon: "?" },
                  { value: "b", label: "Black", icon: "♚" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setColorChoice(opt.value)}
                  className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors ${
                    colorChoice === opt.value
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  <div className="text-xl">{opt.icon}</div>
                  <div>{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStart}
            className="w-full rounded-lg bg-accent px-4 py-3 text-lg font-bold text-accent-foreground hover:bg-accent/80"
          >
            Play
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
