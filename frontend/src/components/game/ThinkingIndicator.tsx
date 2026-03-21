import { memo } from "react";

interface ThinkingIndicatorProps {
  readonly isThinking: boolean;
}

export const ThinkingIndicator = memo(function ThinkingIndicator({
  isThinking,
}: ThinkingIndicatorProps) {
  if (!isThinking) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="animate-pulse text-lg">♞</span>
      <span>Thinking...</span>
    </div>
  );
});
