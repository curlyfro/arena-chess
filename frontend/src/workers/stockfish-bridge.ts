import type { EvalScore, StockfishMessage } from "@/types/engine";

type MessageHandler = (msg: StockfishMessage) => void;

/**
 * Manages the Stockfish WASM Web Worker lifecycle and UCI protocol parsing.
 * Not a Web Worker itself — wraps one.
 */
export class StockfishBridge {
  private worker: Worker | null = null;
  private handlers = new Set<MessageHandler>();
  private _ready = false;

  get ready(): boolean {
    return this._ready;
  }

  async init(): Promise<void> {
    if (this.worker) return;

    // Load stockfish single-thread WASM build from public/stockfish/.
    // Files are copied from node_modules/stockfish/bin/ during setup.
    // Using the public directory avoids Vite worker bundling issues with WASM.
    try {
      this.worker = new Worker("/stockfish/stockfish-18-single.js");
    } catch (e) {
      console.error("Failed to load Stockfish:", e);
      return;
    }

    this.worker.onmessage = (e: MessageEvent<string>) => {
      const msg = this.parseUciLine(e.data);
      if (msg) {
        this.notify(msg);
      }
    };

    this.worker.onerror = (e) => {
      console.error("Stockfish worker error:", e);
    };

    // Initialize UCI
    this.send("uci");

    // Wait for uciok
    await new Promise<void>((resolve) => {
      const handler = (msg: StockfishMessage) => {
        if (msg.uciOk) {
          this.handlers.delete(handler);
          resolve();
        }
      };
      this.handlers.add(handler);
    });

    this.send("isready");

    // Wait for readyok
    await new Promise<void>((resolve) => {
      const handler = (msg: StockfishMessage) => {
        if (msg.ready) {
          this._ready = true;
          this.handlers.delete(handler);
          resolve();
        }
      };
      this.handlers.add(handler);
    });
  }

  send(command: string): void {
    this.worker?.postMessage(command);
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this._ready = false;
    this.handlers.clear();
  }

  private notify(msg: StockfishMessage): void {
    for (const handler of this.handlers) {
      handler(msg);
    }
  }

  private parseUciLine(line: string): StockfishMessage | null {
    if (typeof line !== "string") return null;

    if (line === "uciok") {
      return { uciOk: true };
    }

    if (line === "readyok") {
      return { ready: true };
    }

    // Parse "bestmove e2e4 ponder d7d5"
    if (line.startsWith("bestmove")) {
      const parts = line.split(" ");
      return {
        bestMove: parts[1],
        ponder: parts[3],
      };
    }

    // Parse "info depth 12 score cp 35 ..." or "info depth 12 score mate 3 ..."
    if (line.startsWith("info") && line.includes("score")) {
      const depthMatch = line.match(/depth (\d+)/);
      const cpMatch = line.match(/score cp (-?\d+)/);
      const mateMatch = line.match(/score mate (-?\d+)/);

      if (depthMatch && (cpMatch || mateMatch)) {
        const depth = parseInt(depthMatch[1]);
        let evaluation: EvalScore;

        if (mateMatch) {
          evaluation = {
            type: "mate",
            value: parseInt(mateMatch[1]),
            depth,
          };
        } else if (cpMatch) {
          evaluation = {
            type: "cp",
            value: parseInt(cpMatch[1]),
            depth,
          };
        } else {
          return null;
        }

        return { evaluation };
      }
    }

    return null;
  }
}
