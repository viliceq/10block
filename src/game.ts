import {
  applyPlacement,
  createEmptyBoard,
  type BoardState,
} from './engine';
import { samplePiece, type Piece } from './pieces';
import { createBoard, renderBoardState } from './board';
import { createTray, renderPieceInSlot, TRAY_SIZE } from './tray';

export { TRAY_SIZE };

export type GameOptions = {
  readonly rng?: () => number;
};

export type GameApi = {
  mount(root: HTMLElement): void;
  place(slotIndex: number, anchorRow: number, anchorCol: number): void;
  readonly boardState: BoardState;
  readonly trayPieces: ReadonlyArray<Piece | null>;
};

export function createGame(options: GameOptions = {}): GameApi {
  const rng = options.rng ?? Math.random;
  let board: BoardState = createEmptyBoard();
  let tray: Array<Piece | null> = [];
  const boardEl = createBoard();
  const trayEl = createTray();

  function refillTray(): void {
    tray = Array.from({ length: TRAY_SIZE }, () => samplePiece(rng));
  }

  function render(): void {
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
    board = applyPlacement(board, piece, anchorRow, anchorCol);
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
  };
}
