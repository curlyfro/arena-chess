import type { TutorialLesson } from "@/types/tutorial";

interface TutorialLessonCardProps {
  readonly lesson: TutorialLesson;
  readonly isCompleted: boolean;
  readonly savedStep: number;
  readonly onClick: () => void;
}

export function TutorialLessonCard({
  lesson,
  isCompleted,
  savedStep,
  onClick,
}: TutorialLessonCardProps) {
  const hasProgress = !isCompleted && savedStep > 0;

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5 text-left transition-colors hover:bg-border"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
        {isCompleted ? (
          <span className="text-success">{"\u2713"}</span>
        ) : hasProgress ? (
          <span className="text-warning">{"\u25CF"}</span>
        ) : (
          <span className="text-muted-foreground">{"\u25CB"}</span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-foreground">{lesson.title}</span>
        <p className="truncate text-xs text-muted-foreground">{lesson.description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {hasProgress && (
          <span className="text-[10px] text-muted-foreground">
            Step {savedStep + 1}/{lesson.steps.length}
          </span>
        )}
        <span className="text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          {isCompleted ? "Replay" : hasProgress ? "Resume" : "Start"} {"\u2192"}
        </span>
      </div>
    </button>
  );
}
