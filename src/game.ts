import {
  applyPlacement,
  createEmptyBoard,
  lineBonus,
  resolveClears,
  streakMultiplier,
  type BoardState,
} from './engine';
import { samplePiece, type Piece } from './pieces';
import { createBoard, renderBoardState } from './board';
import { createTray, renderPieceInSlot, TRAY_SIZE } from './tray';
import { createHud, renderScore } from './hud';

export { TRAY_SIZE };

export type GameOptions = {
  readonly rng?: () => number;
};

export type GameApi = {
  mount(root: HTMLElement): void;
  place(slotIndex: number, anchorRow: number, anchorCol: number): void;
  readonly boardState: BoardState;
  readonly trayPieces: ReadonlyArray<Piece | null>;
  readonly score: number;
  readonly streak: number;
};

const PERFECT_CLEAR_BONUS = 300;

function isBoardEmpty(board: BoardState): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (cell !== null) return false;
    }
  }
  return true;
}

export function createGame(options: GameOptions = {}): GameApi {
  const rng = options.rng ?? Math.random;
  let board: BoardState = createEmptyBoard();
  let tray: Array<Piece | null> = [];
  let score = 0;
  let streak = 0;
  const boardEl = createBoard();
  const trayEl = createTray();
  const hudEl = createHud();

  function refillTray(): void {
    tray = Array.from({ length: TRAY_SIZE }, () => samplePiece(rng));
  }

  function render(): void {
    renderScore(hudEl, score);
    renderBoardState(boardEl, board);
    const slots = trayEl.querySelectorAll<HTMLElement>('.tray__slot');
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot) continue;
      const piece = tray[i];
      if (piece) {
        renderPieceInSlot(slot, piece);
      } else {
        slot.replaceChildren();
        slot.removeAttribute('data-piece-id');
      }
    }
  }

  refillTray();
  render();

  function mount(root: HTMLElement): void {
    root.appendChild(hudEl);
    root.appendChild(boardEl);
    root.appendChild(trayEl);
  }

  function place(slotIndex: number, anchorRow: number, anchorCol: number): void {
    if (slotIndex < 0 || slotIndex >= TRAY_SIZE) {
      throw new Error(
        `place: slotIndex ${slotIndex} out of range [0, ${TRAY_SIZE})`,
      );
    }
    const piece = tray[slotIndex];
    if (!piece) {
      throw new Error(`place: slot ${slotIndex} is already empty`);
    }
    const placed = applyPlacement(board, piece, anchorRow, anchorCol);
    const cleared = resolveClears(placed);
    board = cleared.board;

    const L = cleared.rowsCleared.length + cleared.colsCleared.length;
    const newStreak = L > 0 ? streak + 1 : 0;
    const bonus = Math.round(lineBonus(L) * streakMultiplier(newStreak));
    const perfect = isBoardEmpty(board) ? PERFECT_CLEAR_BONUS : 0;
    score += piece.cells.length + bonus + perfect;
    streak = newStreak;

    tray[slotIndex] = null;
    if (tray.every((p) => p === null)) {
      refillTray();
    }
    render();
  }

  return {
    mount,
    place,
    get boardState() {
      return board;
    },
    get trayPieces() {
      return tray.slice();
    },
    get score() {
      return score;
    },
    get streak() {
      return streak;
    },
  };
}
