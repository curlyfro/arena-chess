import { useEffect, useRef } from "react";

interface GameShortcutActions {
  readonly onHint: () => void;
  readonly isGameActive: boolean;
  readonly onToggleShortcutHelp?: () => void;
}

/**
 * Registers game-specific keyboard shortcuts not already handled by useHistoryNavigation
 * (which covers arrows, Home, End, f, Escape).
 */
export function useKeyboardShortcuts(actions: GameShortcutActions) {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.key === "h" && actionsRef.current.isGameActive) {
        actionsRef.current.onHint();
      }
      if (e.key === "?" && actionsRef.current.onToggleShortcutHelp) {
        actionsRef.current.onToggleShortcutHelp();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
}
