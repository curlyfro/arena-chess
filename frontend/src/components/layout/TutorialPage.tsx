import { useCallback, useState } from "react";
import { Link } from "react-router";
import { ChessBoard } from "@/components/board/ChessBoard";
import { TutorialBoardOverlay } from "@/components/tutorials/TutorialBoardOverlay";
import { TutorialCategoryCard } from "@/components/tutorials/TutorialCategoryCard";
import { TutorialLessonCard } from "@/components/tutorials/TutorialLessonCard";
import { TutorialSidebar } from "@/components/tutorials/TutorialSidebar";
import { useTutorial } from "@/hooks/use-tutorial";
import { useBoardPreferences } from "@/hooks/use-board-theme";
import { useTutorialStore } from "@/stores/tutorial-store";
import {
  TUTORIAL_CATEGORIES,
  TUTORIAL_LESSONS,
  getLessonsForCategory,
  getNextLesson,
} from "@/constants/tutorial-lessons";
import type { TutorialLesson, TutorialCategory } from "@/types/tutorial";

const NOOP_PREMOVE = () => {};

// ─── Active Lesson View ───────────────────────────────

function LessonView({
  lesson,
  onBack,
  onStartLesson,
}: {
  readonly lesson: TutorialLesson;
  readonly onBack: () => void;
  readonly onStartLesson: (lesson: TutorialLesson) => void;
}) {
  const tutorial = useTutorial(lesson);
  const { theme, pieceSet, showCoordinates } = useBoardPreferences();

  const step = tutorial.currentStep;
  const isInstruction = step.type === "instruction";
  const hasOverlay =
    isInstruction &&
    ((step.highlights && step.highlights.length > 0) ||
      (step.arrows && step.arrows.length > 0));

  const handleNextLesson = useCallback(() => {
    const next = getNextLesson(lesson.id);
    if (next) onStartLesson(next);
  }, [lesson.id, onStartLesson]);

  const nextLesson = getNextLesson(lesson.id);

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background p-4">
      {/* Header */}
      <div className="mb-4 flex w-full max-w-5xl items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground hover:bg-border"
          >
            {"\u2190"}
          </button>
          <h1 className="text-lg font-bold text-foreground">{lesson.title}</h1>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {lesson.category}
        </span>
      </div>

      {/* Board + Sidebar */}
      <div className="flex w-full max-w-5xl flex-col items-start gap-4 md:flex-row">
        {/* Board wrapper */}
        <div className="relative w-full max-w-[900px] md:flex-1">
          <ChessBoard
            board={tutorial.board}
            turn={tutorial.turn}
            playerColor={tutorial.playerColor}
            isGameOver={isInstruction}
            isCheck={tutorial.isCheck}
            flipped={step.flipped ?? false}
            theme={theme}
            pieceSet={pieceSet}
            showCoordinates={showCoordinates}
            lastMove={tutorial.lastMove}
            premove={null}
            bestMoveArrow={null}
            getLegalMovesForSquare={tutorial.getLegalMovesForSquare}
            onMove={tutorial.tryMove}
            onPremove={NOOP_PREMOVE}
          />
          {hasOverlay && (
            <TutorialBoardOverlay
              highlights={step.highlights ?? []}
              arrows={step.arrows ?? []}
              flipped={step.flipped ?? false}
            />
          )}
        </div>

        {/* Sidebar */}
        <TutorialSidebar
          stepIndex={tutorial.stepIndex}
          totalSteps={tutorial.totalSteps}
          currentStep={tutorial.currentStep}
          status={tutorial.status}
          hintText={tutorial.hintText}
          xpReward={lesson.xpReward}
          isLessonComplete={tutorial.isLessonComplete}
          onNext={tutorial.nextStep}
          onBackToList={onBack}
          onNextLesson={nextLesson ? handleNextLesson : null}
        />
      </div>
    </div>
  );
}

// ─── Category/Lesson Selection View ───────────────────

export function TutorialPage() {
  const [activeLesson, setActiveLesson] = useState<TutorialLesson | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TutorialCategory | null>("basics");
  const completedLessons = useTutorialStore((s) => s.completedLessons);
  const lessonProgress = useTutorialStore((s) => s.lessonProgress);
  const getCategoryProgress = useTutorialStore((s) => s.getCategoryProgress);

  const totalCompleted = completedLessons.length;
  const totalLessons = TUTORIAL_LESSONS.length;
  const overallProgress = totalLessons > 0 ? totalCompleted / totalLessons : 0;

  const handleStartLesson = useCallback((lesson: TutorialLesson) => {
    setActiveLesson(lesson);
  }, []);

  const handleBack = useCallback(() => {
    setActiveLesson(null);
  }, []);

  const handleCategoryClick = useCallback((catId: TutorialCategory) => {
    setSelectedCategory((prev) => (prev === catId ? null : catId));
  }, []);

  // Active lesson view
  if (activeLesson) {
    return (
      <LessonView
        key={activeLesson.id}
        lesson={activeLesson}
        onBack={handleBack}
        onStartLesson={handleStartLesson}
      />
    );
  }

  // Selection view
  return (
    <div className="flex min-h-dvh flex-col items-center bg-background p-4">
      {/* Header */}
      <div className="mb-6 flex w-full max-w-2xl items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">
          {"\u265A"} Tutorials
        </h1>
        <Link
          to="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {"\u2190"} Home
        </Link>
      </div>

      {/* Hero banner */}
      <div className="mb-6 w-full max-w-2xl rounded-xl bg-gradient-to-br from-accent/20 via-muted to-muted p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/20 text-3xl">
            {"\u265E"}
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-foreground">Learn Chess</h2>
            <p className="text-xs text-muted-foreground">
              {totalCompleted === 0
                ? "Start with the basics and work your way up to advanced tactics."
                : `${totalCompleted} of ${totalLessons} lessons completed`}
            </p>
          </div>
          {totalCompleted > 0 && (
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-accent">
                {Math.round(overallProgress * 100)}%
              </span>
            </div>
          )}
        </div>
        {totalCompleted > 0 && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-background/30">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${overallProgress * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Category list */}
      <div className="flex w-full max-w-2xl flex-col gap-3">
        {TUTORIAL_CATEGORIES.map((cat) => {
          const { completed, total } = getCategoryProgress(cat.id);
          const isSelected = selectedCategory === cat.id;
          const lessons = getLessonsForCategory(cat.id);

          return (
            <div key={cat.id}>
              <TutorialCategoryCard
                category={cat}
                completed={completed}
                total={total}
                isSelected={isSelected}
                onClick={() => handleCategoryClick(cat.id)}
              />

              {/* Expanded lesson list */}
              {isSelected && (
                <div className="mt-2 flex flex-col gap-1.5 rounded-lg bg-muted/30 p-2">
                  {lessons.map((lesson) => (
                    <TutorialLessonCard
                      key={lesson.id}
                      lesson={lesson}
                      isCompleted={completedLessons.includes(lesson.id)}
                      savedStep={lessonProgress[lesson.id] ?? 0}
                      onClick={() => handleStartLesson(lesson)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
