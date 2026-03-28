import { useCallback, useEffect, useRef, useState } from "react";
import { useChessGame } from "./use-chess-game";
import { useAchievementChecker } from "./use-achievement-checker";
import { useTutorialStore, areAllBasicsComplete, areAllLessonsComplete } from "@/stores/tutorial-store";
import type { TutorialLesson, TutorialStep, MoveStep } from "@/types/tutorial";
import type { ChessMove, PieceColor, Square } from "@/types/chess";

export type TutorialStatus =
  | "instruction"
  | "awaiting_move"
  | "wrong_move"
  | "freeplay"
  | "step_complete"
  | "lesson_complete";

export interface UseTutorialReturn {
  readonly lesson: TutorialLesson;
  readonly currentStep: TutorialStep;
  readonly stepIndex: number;
  readonly totalSteps: number;
  readonly status: TutorialStatus;
  readonly board: ReturnType<typeof useChessGame>["board"];
  readonly turn: PieceColor;
  readonly playerColor: PieceColor;
  readonly isCheck: boolean;
  readonly lastMove: { from: Square; to: Square } | null;
  readonly hintText: string | null;
  readonly getLegalMovesForSquare: (sq: Square) => readonly ChessMove[];
  readonly tryMove: (move: ChessMove) => boolean;
  readonly nextStep: () => void;
  readonly isLessonComplete: boolean;
  readonly progress: number;
}

export function useTutorial(lesson: TutorialLesson): UseTutorialReturn {
  const savedProgress = useTutorialStore((s) => s.lessonProgress[lesson.id] ?? 0);
  const [stepIndex, setStepIndex] = useState(() => {
    const idx = Math.min(savedProgress, lesson.steps.length - 1);
    return Math.max(0, idx);
  });
  const [status, setStatus] = useState<TutorialStatus>(() => statusForStep(lesson.steps[stepIndex]));
  const [hintText, setHintText] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  const game = useChessGame(lesson.steps[stepIndex].fen);
  const { checkTutorialAchievements } = useAchievementChecker();
  const completeLesson = useTutorialStore((s) => s.completeLesson);
  const setLessonProgress = useTutorialStore((s) => s.setLessonProgress);

  const resultRecordedRef = useRef(false);
  const autoReplyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wrongMoveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Track which step timers belong to, so stale timers are no-ops
  const stepIndexRef = useRef(stepIndex);
  stepIndexRef.current = stepIndex;

  const currentStep = lesson.steps[stepIndex];
  const totalSteps = lesson.steps.length;
  const isLessonComplete = status === "lesson_complete";

  // Stable ref to game so timer callbacks always use latest instance
  const gameRef = useRef(game);
  gameRef.current = game;

  const clearTimers = useCallback(() => {
    clearTimeout(autoReplyTimerRef.current);
    clearTimeout(wrongMoveTimerRef.current);
    autoReplyTimerRef.current = undefined;
    wrongMoveTimerRef.current = undefined;
  }, []);

  // Reset board when step changes
  useEffect(() => {
    game.reset(currentStep.fen);
    setLastMove(null);
    setHintText(null);
    setStatus(statusForStep(currentStep));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  // Cleanup timers on unmount
  useEffect(() => clearTimers, [clearTimers]);

  const tryMove = useCallback(
    (move: ChessMove): boolean => {
      if (status !== "awaiting_move" || currentStep.type !== "move") return false;

      const moveStep = currentStep as MoveStep;
      const expected = moveStep.expectedMove;

      const isCorrect =
        move.from === expected.from &&
        move.to === expected.to &&
        (expected.promotion == null || move.promotion === expected.promotion);

      if (isCorrect) {
        const result = game.makeMove(move);
        if (!result) return false;

        setLastMove({ from: move.from, to: move.to });
        setHintText(null);
        setStatus("step_complete");

        if (moveStep.autoReply) {
          const reply = moveStep.autoReply;
          const capturedStep = stepIndexRef.current;
          autoReplyTimerRef.current = setTimeout(() => {
            // Guard: only execute if we're still on the same step
            if (stepIndexRef.current !== capturedStep) return;
            const replyResult = gameRef.current.makeMove({
              from: reply.from,
              to: reply.to,
              promotion: reply.promotion as ChessMove["promotion"],
            });
            if (replyResult) {
              setLastMove({ from: reply.from, to: reply.to });
            }
          }, 400);
        }
        return true;
      } else {
        // Wrong move — attempt it, then undo
        const result = game.makeMove(move);
        if (result) {
          setStatus("wrong_move");
          setHintText(moveStep.hintText ?? "That's not the right move. Try again!");
          const capturedStep = stepIndexRef.current;
          wrongMoveTimerRef.current = setTimeout(() => {
            if (stepIndexRef.current !== capturedStep) return;
            gameRef.current.undo();
            setLastMove(null);
            setStatus("awaiting_move");
          }, 800);
          return true;
        }
        return false;
      }
    },
    [status, currentStep, game],
  );

  const nextStep = useCallback(() => {
    // Clear timers FIRST to prevent stale callbacks
    clearTimers();

    if (stepIndex >= totalSteps - 1) {
      setStatus("lesson_complete");
      if (!resultRecordedRef.current) {
        resultRecordedRef.current = true;
        completeLesson(lesson.id, lesson.xpReward);
        const completedCount = useTutorialStore.getState().completedLessons.length;
        checkTutorialAchievements(completedCount, areAllBasicsComplete(), areAllLessonsComplete());
      }
      return;
    }

    const nextIdx = stepIndex + 1;
    setStepIndex(nextIdx);
    setLessonProgress(lesson.id, nextIdx);
  }, [stepIndex, totalSteps, lesson, completeLesson, setLessonProgress, checkTutorialAchievements, clearTimers]);

  // For freeplay, allow any legal move
  const freeplayMove = useCallback(
    (move: ChessMove): boolean => {
      const result = game.makeMove(move);
      if (result) {
        setLastMove({ from: move.from, to: move.to });
        return true;
      }
      return false;
    },
    [game],
  );

  const effectivePlayerColor: PieceColor =
    currentStep.type === "move"
      ? currentStep.playerColor
      : currentStep.type === "freeplay"
        ? game.turn
        : "w";

  const effectiveOnMove = currentStep.type === "move" ? tryMove : freeplayMove;

  return {
    lesson,
    currentStep,
    stepIndex,
    totalSteps,
    status,
    board: game.board,
    turn: game.turn,
    playerColor: effectivePlayerColor,
    isCheck: game.isCheck,
    lastMove,
    hintText,
    getLegalMovesForSquare: game.getLegalMovesForSquare,
    tryMove: effectiveOnMove,
    nextStep,
    isLessonComplete,
    progress: totalSteps > 0 ? (stepIndex + 1) / totalSteps : 0,
  };
}

function statusForStep(step: TutorialStep): TutorialStatus {
  switch (step.type) {
    case "instruction":
      return "instruction";
    case "move":
      return "awaiting_move";
    case "freeplay":
      return "freeplay";
  }
}
