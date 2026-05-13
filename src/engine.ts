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

export type ClearResult = {
  readonly board: BoardState;
  readonly rowsCleared: ReadonlyArray<number>;
  readonly colsCleared: ReadonlyArray<number>;
};

export function resolveClears(board: BoardState): ClearResult {
  const rowsCleared: number[] = [];
  const colsCleared: number[] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    const row = board[r];
    if (!row) continue;
    let full = true;
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = row[c];
      if (cell === null || cell === undefined) {
        full = false;
        break;
      }
    }
    if (full) rowsCleared.push(r);
  }

  for (let c = 0; c < BOARD_SIZE; c++) {
    let full = true;
    for (let r = 0; r < BOARD_SIZE; r++) {
      const cell = board[r]?.[c];
      if (cell === null || cell === undefined) {
        full = false;
        break;
      }
    }
    if (full) colsCleared.push(c);
  }

  const rowSet = new Set(rowsCleared);
  const colSet = new Set(colsCleared);
  const next: CellState[][] = board.map((row, r) =>
    row.map((cell, c) => (rowSet.has(r) || colSet.has(c) ? null : cell)),
  );

  return { board: next, rowsCleared, colsCleared };
}
