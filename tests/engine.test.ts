import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  canPlace,
  type BoardState,
  type CellState,
} from '../src/engine';
import { CATALOG, type Piece, type PieceFamily } from '../src/pieces';

function pieceById(id: string): Piece {
  const p = CATALOG.find((x) => x.id === id);
  if (!p) throw new Error(`piece "${id}" not found in CATALOG`);
  return p;
}

function withFilled(filled: ReadonlyArray<readonly [number, number, PieceFamily]>): BoardState {
  const grid: CellState[][] = Array.from(
    { length: 10 },
    () => Array.from({ length: 10 }, () => null) as CellState[],
  );
  for (const [r, c, fam] of filled) {
    const row = grid[r];
    if (row) row[c] = fam;
  }
  return grid;
}

describe('createEmptyBoard()', () => {
  it('returns a 10x10 grid', () => {
    const board = createEmptyBoard();
    expect(board.length).toBe(10);
    for (const row of board) {
      expect(row.length).toBe(10);
    }
  });

  it('starts with every cell null', () => {
    const board = createEmptyBoard();
    for (const row of board) {
      for (const cell of row) {
        expect(cell).toBeNull();
      }
    }
  });

  it('returns independent grids and rows on each call', () => {
    const a = createEmptyBoard();
    const b = createEmptyBoard();
    expect(a).not.toBe(b);
    expect(a[0]).not.toBe(b[0]);
    expect(a[5]).not.toBe(b[5]);
  });
});

describe('canPlace() — bounds on empty board', () => {
  const empty = createEmptyBoard();

  it('accepts single at every interior anchor', () => {
    const single = pieceById('single');
    for (const [r, c] of [[0, 0], [9, 9], [5, 5], [3, 7]] as ReadonlyArray<readonly [number, number]>) {
      expect(canPlace(empty, single, r, c), `single@(${r},${c})`).toBe(true);
    }
  });

  it('rejects single at out-of-bounds anchors', () => {
    const single = pieceById('single');
    expect(canPlace(empty, single, -1, 0)).toBe(false);
    expect(canPlace(empty, single, 0, -1)).toBe(false);
    expect(canPlace(empty, single, 10, 0)).toBe(false);
    expect(canPlace(empty, single, 0, 10)).toBe(false);
  });

  it('penta-h fits up to column 5', () => {
    const piece = pieceById('penta-h');
    expect(canPlace(empty, piece, 0, 0)).toBe(true);
    expect(canPlace(empty, piece, 0, 5)).toBe(true);
    expect(canPlace(empty, piece, 0, 6)).toBe(false);
  });

  it('penta-v fits up to row 5', () => {
    const piece = pieceById('penta-v');
    expect(canPlace(empty, piece, 0, 0)).toBe(true);
    expect(canPlace(empty, piece, 5, 0)).toBe(true);
    expect(canPlace(empty, piece, 6, 0)).toBe(false);
  });

  it('square-3 fits up to (7,7)', () => {
    const sq3 = pieceById('square-3');
    expect(canPlace(empty, sq3, 0, 0)).toBe(true);
    expect(canPlace(empty, sq3, 7, 7)).toBe(true);
    expect(canPlace(empty, sq3, 8, 0)).toBe(false);
    expect(canPlace(empty, sq3, 0, 8)).toBe(false);
  });

  it('l2-ne respects its 2x2 bbox boundaries', () => {
    const piece = pieceById('l2-ne');
    expect(canPlace(empty, piece, 0, 8)).toBe(true);
    expect(canPlace(empty, piece, 0, 9)).toBe(false);
    expect(canPlace(empty, piece, 8, 0)).toBe(true);
    expect(canPlace(empty, piece, 9, 0)).toBe(false);
  });
});

describe('canPlace() — overlap', () => {
  it('rejects a single placed on a filled cell', () => {
    const board = withFilled([[3, 3, 'single']]);
    expect(canPlace(board, pieceById('single'), 3, 3)).toBe(false);
    expect(canPlace(board, pieceById('single'), 3, 4)).toBe(true);
  });

  it('rejects a multi-cell piece overlapping a single filled cell', () => {
    const board = withFilled([[4, 4, 'line']]);
    expect(canPlace(board, pieceById('square-2'), 3, 3)).toBe(false);
  });

  it('accepts placement next to a filled region', () => {
    const board = withFilled([[5, 5, 'sq2']]);
    expect(canPlace(board, pieceById('single'), 5, 6)).toBe(true);
    expect(canPlace(board, pieceById('domino-h'), 5, 6)).toBe(true);
  });

  it('ignores cells that are in the bbox but not in the piece', () => {
    // l2-nw has cells (0,1), (1,0), (1,1) — the (0,0) corner of the bbox is empty.
    // Filling board (0,0) must NOT prevent placement of l2-nw at anchor (0,0).
    const board = withFilled([[0, 0, 'single']]);
    expect(canPlace(board, pieceById('l2-nw'), 0, 0)).toBe(true);
  });

  it('ignores l3 bbox holes (sparse 3x3 piece)', () => {
    // l3-ne has cells (0,0),(1,0),(2,0),(2,1),(2,2). The other four bbox
    // cells — (0,1), (0,2), (1,1), (1,2) — are not part of the piece.
    const board = withFilled([
      [0, 1, 'single'],
      [0, 2, 'line'],
      [1, 1, 'sq2'],
      [1, 2, 'sq3'],
    ]);
    expect(canPlace(board, pieceById('l3-ne'), 0, 0)).toBe(true);
  });
});

describe('canPlace() — purity', () => {
  it('does not mutate the board across many calls', () => {
    const board = withFilled([
      [0, 0, 'single'],
      [5, 5, 'sq3'],
    ]);
    const snapshot = JSON.parse(JSON.stringify(board));

    for (const piece of CATALOG) {
      for (let r = -1; r < 11; r++) {
        for (let c = -1; c < 11; c++) {
          canPlace(board, piece, r, c);
        }
      }
    }

    expect(JSON.parse(JSON.stringify(board))).toEqual(snapshot);
  });
});
