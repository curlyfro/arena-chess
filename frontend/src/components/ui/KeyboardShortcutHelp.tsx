import * as Dialog from "@radix-ui/react-dialog";
import { CloseIcon } from "./CloseIcon";

const SHORTCUTS = [
  { key: "←  →", description: "Navigate moves" },
  { key: "Home", description: "Go to start" },
  { key: "End", description: "Go to end" },
  { key: "H", description: "Show hint" },
  { key: "F", description: "Flip board" },
  { key: "Esc", description: "Return to live" },
  { key: "?", description: "Toggle this help" },
] as const;

interface KeyboardShortcutHelpProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function KeyboardShortcutHelp({ open, onClose }: KeyboardShortcutHelpProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background p-5 shadow-xl ring-1 ring-border">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-base font-bold text-foreground">
              Keyboard Shortcuts
            </Dialog.Title>
            <Dialog.Close
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <CloseIcon />
            </Dialog.Close>
          </div>
          <div className="space-y-2">
            {SHORTCUTS.map((s) => (
              <div key={s.key} className="flex items-center justify-between text-sm">
                <kbd className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                  {s.key}
                </kbd>
                <span className="text-muted-foreground">{s.description}</span>
              </div>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
