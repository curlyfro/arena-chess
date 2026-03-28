import type { TutorialStatus } from "@/hooks/use-tutorial";
import type { TutorialStep } from "@/types/tutorial";

interface TutorialSidebarProps {
  readonly stepIndex: number;
  readonly totalSteps: number;
  readonly currentStep: TutorialStep;
  readonly status: TutorialStatus;
  readonly hintText: string | null;
  readonly xpReward: number;
  readonly isLessonComplete: boolean;
  readonly onNext: () => void;
  readonly onBackToList: () => void;
  readonly onNextLesson: (() => void) | null;
}

export function TutorialSidebar({
  stepIndex,
  totalSteps,
  currentStep,
  status,
  hintText,
  xpReward,
  isLessonComplete,
  onNext,
  onBackToList,
  onNextLesson,
}: TutorialSidebarProps) {
  const progress = totalSteps > 0 ? (stepIndex + 1) / totalSteps : 0;

  if (isLessonComplete) {
    return (
      <div className="flex w-full flex-col gap-3 md:w-64 md:shrink-0">
        <div className="rounded-xl bg-gradient-to-b from-success/20 to-muted p-5 text-center">
          <div className="mb-2 text-4xl">{"\u2705"}</div>
          <h3 className="text-lg font-bold text-foreground">Lesson Complete!</h3>
          <p className="mt-1 text-sm font-medium text-success">+{xpReward} XP earned</p>
        </div>
        <div className="flex flex-col gap-2">
          {onNextLesson && (
            <button
              onClick={onNextLesson}
              className="rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/80"
            >
              Next Lesson {"\u2192"}
            </button>
          )}
          <button
            onClick={onBackToList}
            className="rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground hover:bg-border"
          >
            Back to Tutorials
          </button>
        </div>
      </div>
    );
  }

  const showNextButton =
    status === "instruction" ||
    status === "freeplay" ||
    status === "step_complete";

  return (
    <div className="flex w-full flex-col gap-3 md:w-64 md:shrink-0">
      {/* Progress */}
      <div className="rounded-lg bg-muted p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {stepIndex + 1} of {totalSteps}
          </span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i <= stepIndex ? "bg-accent" : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-lg bg-muted p-4">
        <div className="mb-1 flex items-center gap-2">
          <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-medium uppercase text-accent">
            {currentStep.type === "instruction" ? "Learn" : currentStep.type === "move" ? "Practice" : "Explore"}
          </span>
        </div>
        <h3 className="mb-2 text-sm font-bold text-foreground">{currentStep.title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{currentStep.text}</p>
      </div>

      {/* Hint on wrong move */}
      {(status === "wrong_move" || (status === "awaiting_move" && hintText)) && hintText && (
        <div className="rounded-lg bg-warning/10 px-3 py-2.5 text-sm text-warning ring-1 ring-warning/20">
          {"\u{1F4A1}"} {hintText}
        </div>
      )}

      {/* Status indicator for move steps */}
      {status === "awaiting_move" && !hintText && (
        <div className="rounded-lg bg-accent/10 px-3 py-2.5 text-center text-sm font-medium text-accent">
          {"\u2794"} Your turn — make the move!
        </div>
      )}

      {status === "step_complete" && (
        <div className="rounded-lg bg-success/10 px-3 py-2.5 text-center text-sm font-medium text-success">
          {"\u2713"} Correct!
        </div>
      )}

      {/* Next button */}
      {showNextButton && (
        <button
          onClick={onNext}
          className="rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/80"
        >
          {stepIndex >= totalSteps - 1 ? "Finish" : `Next \u2192`}
        </button>
      )}
    </div>
  );
}
