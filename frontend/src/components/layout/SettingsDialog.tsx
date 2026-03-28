import * as Dialog from "@radix-ui/react-dialog";
import { useGameStore } from "@/stores/game-store";
import { BOARD_THEMES, PIECE_SETS } from "@/constants/board-themes";

interface SettingsDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  readonly checked: boolean;
  readonly onChange: (on: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
        checked ? "bg-accent" : "bg-muted"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-foreground shadow-sm transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function SettingRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-foreground">{label}</span>
      {children}
    </div>
  );
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const boardThemeId = useGameStore((s) => s.boardThemeId);
  const setBoardThemeId = useGameStore((s) => s.setBoardThemeId);
  const pieceSet = useGameStore((s) => s.pieceSet);
  const setPieceSet = useGameStore((s) => s.setPieceSet);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const setSoundEnabled = useGameStore((s) => s.setSoundEnabled);
  const showCoordinates = useGameStore((s) => s.showCoordinates);
  const setShowCoordinates = useGameStore((s) => s.setShowCoordinates);
  const showEvalBar = useGameStore((s) => s.showEvalBar);
  const setShowEvalBar = useGameStore((s) => s.setShowEvalBar);

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background p-6 shadow-xl ring-1 ring-border">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-xl font-bold text-foreground">
              Settings
            </Dialog.Title>
            <Dialog.Close
              onClick={onClose}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </Dialog.Close>
          </div>

          {/* Board Theme */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Board Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BOARD_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setBoardThemeId(theme.id)}
                  className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors ${
                    boardThemeId === theme.id
                      ? "bg-accent text-accent-foreground ring-2 ring-accent"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  <div className="flex overflow-hidden rounded">
                    <div
                      className="h-6 w-6"
                      style={{ backgroundColor: theme.lightSquare }}
                    />
                    <div
                      className="h-6 w-6"
                      style={{ backgroundColor: theme.darkSquare }}
                    />
                  </div>
                  <span className="text-xs">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Piece Set */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Piece Set
            </label>
            <div className="flex gap-2">
              {PIECE_SETS.map((set) => (
                <button
                  key={set}
                  onClick={() => setPieceSet(set)}
                  className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium capitalize transition-colors ${
                    pieceSet === set
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  {set}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle settings */}
          <div className="mb-2 border-t border-border pt-3">
            <SettingRow label="Sound">
              <ToggleSwitch checked={soundEnabled} onChange={setSoundEnabled} />
            </SettingRow>
            <SettingRow label="Board Coordinates">
              <ToggleSwitch checked={showCoordinates} onChange={setShowCoordinates} />
            </SettingRow>
            <SettingRow label="Evaluation Bar">
              <ToggleSwitch checked={showEvalBar} onChange={setShowEvalBar} />
            </SettingRow>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
