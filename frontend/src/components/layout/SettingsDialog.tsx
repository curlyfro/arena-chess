import { useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useGameStore } from "@/stores/game-store";
import { BOARD_THEMES, PIECE_SETS } from "@/constants/board-themes";
import { AVATAR_PRESETS } from "@/constants/avatars";
import { PlayerAvatar } from "@/components/game/PlayerAvatar";
import { CloseIcon } from "@/components/ui/CloseIcon";
import { resizeImageToDataUrl } from "@/lib/image-resize";

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
  const soundVolume = useGameStore((s) => s.soundVolume);
  const setSoundVolume = useGameStore((s) => s.setSoundVolume);
  const showCoordinates = useGameStore((s) => s.showCoordinates);
  const setShowCoordinates = useGameStore((s) => s.setShowCoordinates);
  const showEvalBar = useGameStore((s) => s.showEvalBar);
  const setShowEvalBar = useGameStore((s) => s.setShowEvalBar);
  const autoAnalyze = useGameStore((s) => s.autoAnalyze);
  const setAutoAnalyze = useGameStore((s) => s.setAutoAnalyze);
  const avatarId = useGameStore((s) => s.avatarId);
  const setAvatarId = useGameStore((s) => s.setAvatarId);
  const avatarImage = useGameStore((s) => s.avatarImage);
  const setAvatarImage = useGameStore((s) => s.setAvatarImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setAvatarImage(dataUrl);
    } catch {
      // silently fail — user can retry
    }
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

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
              <CloseIcon />
            </Dialog.Close>
          </div>

          {/* Avatar */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Avatar
            </label>

            {/* Upload / current photo */}
            <div className="mb-3 flex items-center gap-3">
              <PlayerAvatar
                type="player"
                name={avatarImage ? "" : "You"}
                avatarId={avatarId}
                avatarImage={avatarImage}
                size={48}
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded bg-accent px-3 py-1 text-xs font-medium text-accent-foreground hover:bg-accent/80"
                >
                  Upload Photo
                </button>
                {avatarImage && (
                  <button
                    onClick={() => setAvatarImage(null)}
                    className="rounded bg-muted px-3 py-1 text-xs text-muted-foreground hover:bg-border"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Preset avatars */}
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_PRESETS.map((preset) => {
                const isSelected = !avatarImage && (
                  preset.id === "initials"
                    ? !avatarId || avatarId === "initials"
                    : avatarId === preset.id
                );
                return (
                  <button
                    key={preset.id}
                    onClick={() => setAvatarId(preset.id === "initials" ? null : preset.id)}
                    className={`flex flex-col items-center gap-1 rounded-lg p-1.5 transition-colors ${
                      isSelected
                        ? "ring-2 ring-accent bg-accent/20"
                        : "hover:bg-muted/80"
                    }`}
                    title={preset.label}
                  >
                    {preset.id === "initials" ? (
                      <PlayerAvatar type="player" name="You" size={32} />
                    ) : (
                      <PlayerAvatar type="player" name="" avatarId={preset.id} size={32} />
                    )}
                    <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
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
            {soundEnabled && (
              <SettingRow label="Volume">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(Number(e.target.value))}
                  className="w-24 accent-accent"
                />
              </SettingRow>
            )}
            <SettingRow label="Board Coordinates">
              <ToggleSwitch checked={showCoordinates} onChange={setShowCoordinates} />
            </SettingRow>
            <SettingRow label="Evaluation Bar">
              <ToggleSwitch checked={showEvalBar} onChange={setShowEvalBar} />
            </SettingRow>
            <SettingRow label="Auto-Analyze Games">
              <ToggleSwitch checked={autoAnalyze} onChange={setAutoAnalyze} />
            </SettingRow>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
