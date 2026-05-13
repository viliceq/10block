import type { Piece, PieceFamily } from './pieces';

export type CellState = PieceFamily | null;

export type BoardState = ReadonlyArray<ReadonlyArray<CellState>>;

export const BOARD_SIZE = 10;

export function createEmptyBoard(): BoardState {
  return Array.from(
    { length: BOARD_SIZE },
    () => Array.from({ length: BOARD_SIZE }, () => null as CellState),
  );
}

export function canPlace(
  board: BoardState,
  piece: Piece,
  anchorRow: number,
  anchorCol: number,
): boolean {
  for (const [r, c] of piece.cells) {
    const row = anchorRow + r;
    const col = anchorCol + c;
    if (row < 0 || row >= BOARD_SIZE) return false;
    if (col < 0 || col >= BOARD_SIZE) return false;
    const boardRow = board[row];
    if (!boardRow) return false;
    if (boardRow[col] !== null) return false;
  }
  return true;
}

export function applyPlacement(
  board: BoardState,
  piece: Piece,
  anchorRow: number,
  anchorCol: number,
): BoardState {
  if (!canPlace(board, piece, anchorRow, anchorCol)) {
    throw new Error(
      `applyPlacement: piece "${piece.id}" does not fit at (${anchorRow}, ${anchorCol})`,
    );
  }
  const next: CellState[][] = board.map((row) => row.slice());
  for (const [r, c] of piece.cells) {
    const row = next[anchorRow + r];
    if (row) row[anchorCol + c] = piece.family;
  }
  return next;
}
