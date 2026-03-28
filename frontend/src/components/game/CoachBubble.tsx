import { memo, useEffect, useState } from "react";
import type { CoachTip } from "@/lib/game-coach";

interface CoachBubbleProps {
  readonly tip: CoachTip | null;
}

const TYPE_STYLES: Record<CoachTip["type"], string> = {
  praise: "bg-success/15 text-success border-success/30",
  warning: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  teaching: "bg-accent/15 text-accent border-accent/30",
};

const TYPE_ICONS: Record<CoachTip["type"], string> = {
  praise: "\u2705",
  warning: "\u26A0\uFE0F",
  teaching: "\uD83D\uDCA1",
};

export const CoachBubble = memo(function CoachBubble({ tip }: CoachBubbleProps) {
  const [visible, setVisible] = useState(false);
  const [displayedTip, setDisplayedTip] = useState<CoachTip | null>(null);

  useEffect(() => {
    if (tip) {
      setDisplayedTip(tip);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [tip]);

  if (!visible || !displayedTip) return null;

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-xs leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-200 ${TYPE_STYLES[displayedTip.type]}`}
    >
      <span className="mr-1.5">{TYPE_ICONS[displayedTip.type]}</span>
      {displayedTip.message}
    </div>
  );
});
