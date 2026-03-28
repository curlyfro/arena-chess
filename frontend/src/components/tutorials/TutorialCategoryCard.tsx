import type { TutorialCategoryDef } from "@/types/tutorial";

const CATEGORY_ACCENTS: Record<string, string> = {
  basics: "from-accent/30 to-accent/5",
  openings: "from-success/30 to-success/5",
  midgame: "from-warning/30 to-warning/5",
  endgame: "from-destructive/30 to-destructive/5",
};

const CATEGORY_BAR_COLORS: Record<string, string> = {
  basics: "bg-accent",
  openings: "bg-success",
  midgame: "bg-warning",
  endgame: "bg-destructive",
};

interface TutorialCategoryCardProps {
  readonly category: TutorialCategoryDef;
  readonly completed: number;
  readonly total: number;
  readonly isSelected: boolean;
  readonly onClick: () => void;
}

export function TutorialCategoryCard({
  category,
  completed,
  total,
  isSelected,
  onClick,
}: TutorialCategoryCardProps) {
  const progress = total > 0 ? completed / total : 0;
  const allDone = completed === total && total > 0;
  const accent = CATEGORY_ACCENTS[category.id] ?? "from-accent/30 to-accent/5";
  const barColor = CATEGORY_BAR_COLORS[category.id] ?? "bg-accent";

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl bg-gradient-to-r p-4 text-left transition-all ${accent} ${
        isSelected ? "ring-1 ring-accent" : "hover:brightness-125"
      }`}
    >
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-background/50 text-2xl">
          {category.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-foreground">{category.label}</span>
            {allDone && <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-medium text-success">Complete</span>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{category.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-background/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {completed}/{total}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background/30">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </button>
  );
}
