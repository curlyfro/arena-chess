import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Chess } from "chess.js";

interface PgnImportDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onImport: (pgn: string) => void;
}

export function PgnImportDialog({ open, onClose, onImport }: PgnImportDialogProps) {
  const [pgnText, setPgnText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    setError(null);
    const trimmed = pgnText.trim();
    if (!trimmed) {
      setError("Please paste a PGN");
      return;
    }

    try {
      const chess = new Chess();
      chess.loadPgn(trimmed);
      if (chess.history().length === 0) {
        setError("No moves found in PGN");
        return;
      }
      onImport(trimmed);
      setPgnText("");
      onClose();
    } catch {
      setError("Invalid PGN format");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background p-6 shadow-xl ring-1 ring-border">
          <Dialog.Title className="mb-4 text-lg font-bold text-foreground">
            Load PGN
          </Dialog.Title>

          <textarea
            value={pgnText}
            onChange={(e) => setPgnText(e.target.value)}
            placeholder="Paste PGN here..."
            className="mb-3 h-40 w-full resize-none rounded-lg bg-muted p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />

          {error && (
            <p className="mb-3 text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleImport}
              className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/80"
            >
              Load
            </button>
            <Dialog.Close asChild>
              <button
                onClick={onClose}
                className="flex-1 rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground ring-1 ring-border hover:bg-border"
              >
                Cancel
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
