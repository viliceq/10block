import type { GameApi } from './game';
import type { Piece } from './pieces';
import { canPlace, BOARD_SIZE } from './engine';
import { renderBoardState } from './board';

export type DragApi = {
  destroy(): void;
};

type ActiveDrag = {
  pointerId: number;
  slotIndex: number;
  slot: HTMLElement;
  ghost: HTMLElement;
  /** Half of `--cell-size` at drag start. The ghost's top-left bbox cell is
   *  centred on the pointer by subtracting this from clientX/clientY. */
  pointerOffset: number;
};

/** Mirrors the iPad default for `--cell-size` in `src/styles/tokens.css`.
 *  A token-vs-fallback drift test in `tests/tokens.test.ts` keeps these in sync. */
export const CELL_SIZE_FALLBACK = 64;

function readCellSize(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--cell-size');
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : CELL_SIZE_FALLBACK;
}

export function createDrag(
  game: GameApi,
  trayEl: HTMLElement,
  boardEl: HTMLElement,
): DragApi {
  let active: ActiveDrag | null = null;

  function onPointerDown(e: PointerEvent): void {
    if (active) return;
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const slot = target.closest<HTMLElement>('.tray__slot');
    if (!slot || !trayEl.contains(slot)) return;
    const slotIndex = Number(slot.dataset['slotIndex']);
    if (!Number.isFinite(slotIndex)) return;
    const piece = game.trayPieces[slotIndex];
    if (!piece) return;

    const pointerOffset = readCellSize() / 2;
    const ghost = createGhost(piece);
    positionGhost(ghost, e.clientX, e.clientY, pointerOffset);
    document.body.appendChild(ghost);
    slot.dataset['picked'] = 'true';

    try {
      slot.setPointerCapture(e.pointerId);
    } catch {
      // setPointerCapture may not be supported in some test environments.
    }

    active = { pointerId: e.pointerId, slotIndex, slot, ghost, pointerOffset };
  }

  function onPointerMove(e: PointerEvent): void {
    if (!active || e.pointerId !== active.pointerId) return;
    positionGhost(active.ghost, e.clientX, e.clientY, active.pointerOffset);
    updatePreview(e.clientX, e.clientY);
  }

  function updatePreview(x: number, y: number): void {
    if (!active) return;
    // Re-render canonical engine state so any prior preview is wiped.
    renderBoardState(boardEl, game.boardState);

    const target = findBoardCell(x, y);
    if (!target) return;

    const piece = game.trayPieces[active.slotIndex];
    if (!piece) return;

    const ok = canPlace(game.boardState, piece, target.row, target.col);
    const state = ok ? 'preview-ok' : 'preview-bad';

    for (const [r, c] of piece.cells) {
      const row = target.row + r;
      const col = target.col + c;
      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) continue;
      const cellEl = boardEl.querySelector<HTMLElement>(
        `.board__cell[data-row="${row}"][data-col="${col}"]`,
      );
      if (cellEl) cellEl.dataset['state'] = state;
    }
  }

  function clearPreview(): void {
    renderBoardState(boardEl, game.boardState);
  }

  function finishDrag(release: { x: number; y: number; place: boolean }): void {
    if (!active) return;
    const { slotIndex, slot, ghost } = active;

    let placed = false;
    if (release.place) {
      const piece = game.trayPieces[slotIndex];
      if (piece) {
        const cell = findBoardCell(release.x, release.y);
        if (cell && canPlace(game.boardState, piece, cell.row, cell.col)) {
          game.place(slotIndex, cell.row, cell.col);
          placed = true; // game.place re-rendered; preview already gone.
        }
      }
    }
    if (!placed) clearPreview();

    ghost.remove();
    slot.removeAttribute('data-picked');
    active = null;
  }

  function onPointerUp(e: PointerEvent): void {
    if (!active || e.pointerId !== active.pointerId) return;
    finishDrag({ x: e.clientX, y: e.clientY, place: true });
  }

  function onPointerCancel(e: PointerEvent): void {
    if (!active || e.pointerId !== active.pointerId) return;
    finishDrag({ x: 0, y: 0, place: false });
  }

  trayEl.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerCancel);

  function destroy(): void {
    trayEl.removeEventListener('pointerdown', onPointerDown);
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerCancel);
    if (active) {
      active.ghost.remove();
      active.slot.removeAttribute('data-picked');
      clearPreview();
      active = null;
    }
  }

  return { destroy };
}

function createGhost(piece: Piece): HTMLElement {
  const ghost = document.createElement('div');
  ghost.className = 'ghost';
  ghost.style.setProperty('--bbox-w', String(piece.bbox.w));
  ghost.style.setProperty('--bbox-h', String(piece.bbox.h));
  ghost.style.setProperty('--piece-color', `var(--color-piece-${piece.family})`);
  for (const [row, col] of piece.cells) {
    const cell = document.createElement('div');
    cell.className = 'ghost__cell';
    cell.style.gridRow = String(row + 1);
    cell.style.gridColumn = String(col + 1);
    ghost.appendChild(cell);
  }
  return ghost;
}

function positionGhost(
  ghost: HTMLElement,
  x: number,
  y: number,
  offset: number,
): void {
  ghost.style.transform = `translate3d(${x - offset}px, ${y - offset}px, 0)`;
}

function findBoardCell(x: number, y: number): { row: number; col: number } | null {
  const elements = document.elementsFromPoint(x, y);
  for (const el of elements) {
    if (el instanceof HTMLElement && el.classList.contains('board__cell')) {
      const row = Number(el.dataset['row']);
      const col = Number(el.dataset['col']);
      if (Number.isFinite(row) && Number.isFinite(col)) {
        return { row, col };
      }
    }
  }
  return null;
}
