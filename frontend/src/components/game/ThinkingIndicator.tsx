import { memo, useState, useEffect } from "react";

const THINKING_PHRASES = [
  "Considering options",
  "Evaluating positions",
  "Calculating variations",
  "Analyzing the board",
  "Planning ahead",
];

interface ThinkingIndicatorProps {
  readonly isThinking: boolean;
}

export const ThinkingIndicator = memo(function ThinkingIndicator({
  isThinking,
}: ThinkingIndicatorProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (!isThinking) return;

    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % THINKING_PHRASES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isThinking]);

  if (!isThinking) return null;

  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span
          className="inline-block text-lg"
          style={{ animation: "knight-rock 1.2s ease-in-out infinite" }}
        >
          ♞
        </span>
        <span>
          {THINKING_PHRASES[phraseIndex]}
          <span
            className="inline-block w-1 h-1 rounded-full bg-current mx-0.5 align-middle"
            style={{ animation: "dot-bounce 1.4s infinite", animationDelay: "0s" }}
          />
          <span
            className="inline-block w-1 h-1 rounded-full bg-current mx-0.5 align-middle"
            style={{ animation: "dot-bounce 1.4s infinite", animationDelay: "0.2s" }}
          />
          <span
            className="inline-block w-1 h-1 rounded-full bg-current mx-0.5 align-middle"
            style={{ animation: "dot-bounce 1.4s infinite", animationDelay: "0.4s" }}
          />
        </span>
      </div>
    </div>
  );
});
