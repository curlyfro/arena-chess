import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Move } from "chess.js";
import type { Square, PieceColor, ChessMove, BoardPiece } from "@/types/chess";
import type { OpeningTreeNode, Continuation, ExplorerMove } from "@/types/openings";

let treeCache: OpeningTreeNode | null = null;
let treePromise: Promise<OpeningTreeNode> | null = null;

async function loadTree(): Promise<OpeningTreeNode> {
  if (treeCache) return treeCache;
  if (!treePromise) {
    treePromise = fetch("/opening-tree.json")
      .then((r) => r.json() as Promise<OpeningTreeNode>)
      .then((data) => {
        treeCache = data;
        return data;
      })
      .catch((err) => {
        treePromise = null; // allow retry on failure
        throw err;
      });
  }
  return treePromise;
}

function walkTree(root: OpeningTreeNode, moves: readonly ExplorerMove[]): OpeningTreeNode | null {
  let node: OpeningTreeNode | null = root;
  for (const move of moves) {
    if (!node?.children?.[move.san]) return null;
    node = node.children[move.san];
  }
  return node;
}

function getContinuations(node: OpeningTreeNode | null): Continuation[] {
  if (!node?.children) return [];
  return Object.entries(node.children).map(([san, child]) => ({
    san,
    eco: child.eco,
    name: child.name,
    hasChildren: !!child.children && Object.keys(child.children).length > 0,
  }));
}

function toExplorerMove(
  result: Move,
  treeNode: OpeningTreeNode | null,
): ExplorerMove {
  const childNode = treeNode?.children?.[result.san];
  return {
    san: result.san,
    from: result.from as Square,
    to: result.to as Square,
    eco: childNode?.eco,
    name: childNode?.name,
  };
}

export interface OpeningSearchResult {
  readonly eco: string;
  readonly name: string;
  readonly moves: readonly string[];
}

function collectOpenings(
  node: OpeningTreeNode,
  path: string[],
  results: OpeningSearchResult[],
) {
  if (node.eco && node.name) {
    results.push({ eco: node.eco, name: node.name, moves: [...path] });
  }
  if (node.children) {
    for (const [san, child] of Object.entries(node.children)) {
      path.push(san);
      collectOpenings(child, path, results);
      path.pop();
    }
  }
}

let allOpeningsCache: OpeningSearchResult[] | null = null;

export function searchOpenings(tree: OpeningTreeNode | null, query: string): OpeningSearchResult[] {
  if (!tree) return [];
  if (!allOpeningsCache) {
    allOpeningsCache = [];
    collectOpenings(tree, [], allOpeningsCache);
  }
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return allOpeningsCache
    .filter((o) => o.name.toLowerCase().includes(q) || o.eco.toLowerCase().includes(q))
    .slice(0, 20);
}

export interface UseOpeningExplorerReturn {
  readonly fen: string;
  readonly board: readonly (BoardPiece | null)[][];
  readonly turn: PieceColor;
  readonly isCheck: boolean;
  readonly getLegalMovesForSquare: (sq: Square) => readonly ChessMove[];
  readonly currentOpening: { eco: string; name: string } | null;
  readonly continuations: readonly Continuation[];
  readonly moveHistory: readonly ExplorerMove[];
  readonly viewIndex: number;
  readonly playMove: (move: ChessMove) => boolean;
  readonly playMoveBySan: (san: string) => void;
  readonly playLine: (sanMoves: readonly string[]) => void;
  readonly goToMove: (index: number) => void;
  readonly goToStart: () => void;
  readonly goBack: () => void;
  readonly goForward: () => void;
  readonly lastMove: { from: Square; to: Square } | null;
  readonly tree: OpeningTreeNode | null;
  readonly isLoading: boolean;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
}

export function useOpeningExplorer(): UseOpeningExplorerReturn {
  const chessRef = useRef(new Chess());
  const [version, setVersion] = useState(0);
  const [history, setHistory] = useState<ExplorerMove[]>([]);
  const [viewIndex, setViewIndex] = useState(-1);
  const [tree, setTree] = useState<OpeningTreeNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    loadTree()
      .then((data) => { setTree(data); setIsLoading(false); })
      .catch(() => { setIsLoading(false); });
  }, []);

  const fen = chessRef.current.fen();
  const turn = chessRef.current.turn() as PieceColor;
  const isCheck = chessRef.current.isCheck();

  const board = useMemo<readonly (BoardPiece | null)[][]>(
    () =>
      chessRef.current.board().map((row) =>
        row.map((sq) =>
          sq ? ({ type: sq.type, color: sq.color } as BoardPiece) : null,
        ),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const getLegalMovesForSquare = useCallback(
    (square: Square): readonly ChessMove[] =>
      chessRef.current.moves({ square, verbose: true }).map((m) => ({
        from: m.from as Square,
        to: m.to as Square,
        promotion: m.promotion as ChessMove["promotion"],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const activeHistory = useMemo(
    () => (viewIndex >= 0 ? history.slice(0, viewIndex + 1) : history),
    [history, viewIndex],
  );

  const currentNode = tree ? walkTree(tree, activeHistory) : null;

  const currentOpening = useMemo(() => {
    for (let i = activeHistory.length - 1; i >= 0; i--) {
      const move = activeHistory[i];
      if (move.eco && move.name) return { eco: move.eco, name: move.name };
    }
    return null;
  }, [activeHistory]);

  const continuations = useMemo(() => getContinuations(currentNode), [currentNode]);

  const lastMove = useMemo(() => {
    const last = activeHistory[activeHistory.length - 1];
    return last ? { from: last.from, to: last.to } : null;
  }, [activeHistory]);

  const rebuildChess = useCallback(
    (moves: readonly ExplorerMove[]) => {
      chessRef.current = new Chess();
      for (const m of moves) {
        chessRef.current.move(m.san);
      }
      bump();
    },
    [bump],
  );

  // Shared logic for committing a move after chess.js validates it
  const commitMove = useCallback(
    (result: Move, currentHist: readonly ExplorerMove[]) => {
      const treeNode = tree ? walkTree(tree, currentHist) : null;
      const explorerMove = toExplorerMove(result, treeNode);
      setHistory([...currentHist, explorerMove]);
      setViewIndex(-1);
      bump();
    },
    [tree, bump],
  );

  // Truncate history to viewIndex if browsing, return the active portion
  const truncateIfViewing = useCallback((): readonly ExplorerMove[] => {
    if (viewIndex < 0) return history;
    const truncated = history.slice(0, viewIndex + 1);
    rebuildChess(truncated);
    return truncated;
  }, [history, viewIndex, rebuildChess]);

  const playMove = useCallback(
    (move: ChessMove): boolean => {
      const currentHist = truncateIfViewing();
      try {
        const result = chessRef.current.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion,
        });
        if (!result) return false;
        commitMove(result, currentHist);
        return true;
      } catch {
        return false;
      }
    },
    [truncateIfViewing, commitMove],
  );

  const playMoveBySan = useCallback(
    (san: string) => {
      const currentHist = truncateIfViewing();
      try {
        const result = chessRef.current.move(san);
        if (!result) return;
        commitMove(result, currentHist);
      } catch {
        // invalid move
      }
    },
    [truncateIfViewing, commitMove],
  );

  const playLine = useCallback(
    (sanMoves: readonly string[]) => {
      const chess = new Chess();
      const newHistory: ExplorerMove[] = [];
      let node: OpeningTreeNode | null = tree;

      for (const san of sanMoves) {
        try {
          const result = chess.move(san);
          if (!result) break;
          const childNode = node?.children?.[result.san] ?? null;
          newHistory.push(toExplorerMove(result, node));
          node = childNode;
        } catch {
          break;
        }
      }

      chessRef.current = chess;
      setHistory(newHistory);
      setViewIndex(-1);
      bump();
    },
    [tree, bump],
  );

  const goToStart = useCallback(() => {
    chessRef.current = new Chess();
    setViewIndex(-1);
    setHistory([]);
    bump();
  }, [bump]);

  const goBack = useCallback(() => {
    if (history.length === 0) return;
    const idx = viewIndex >= 0 ? viewIndex : history.length - 1;
    if (idx <= 0) {
      rebuildChess([]);
      setViewIndex(0);
      // Navigate to "before first move" — set viewIndex to special state
      chessRef.current = new Chess();
      setViewIndex(-1);
      setHistory([]);
      bump();
      return;
    }
    rebuildChess(history.slice(0, idx));
    setViewIndex(idx - 1);
  }, [history, viewIndex, rebuildChess, bump]);

  const goForward = useCallback(() => {
    if (viewIndex < 0 || viewIndex >= history.length - 1) return;
    const target = viewIndex + 1;
    rebuildChess(history.slice(0, target + 1));
    setViewIndex(target);
  }, [history, viewIndex, rebuildChess]);

  const goToMove = useCallback(
    (index: number) => {
      if (index < 0 || index >= history.length) return;
      rebuildChess(history.slice(0, index + 1));
      setViewIndex(index);
    },
    [history, rebuildChess],
  );

  return {
    fen,
    board,
    turn,
    isCheck,
    getLegalMovesForSquare,
    currentOpening,
    continuations,
    moveHistory: activeHistory,
    viewIndex,
    playMove,
    playMoveBySan,
    playLine,
    goToMove,
    goToStart,
    goBack,
    goForward,
    lastMove,
    tree,
    isLoading,
    canGoBack: activeHistory.length > 0,
    canGoForward: viewIndex >= 0 && viewIndex < history.length - 1,
  };
}
