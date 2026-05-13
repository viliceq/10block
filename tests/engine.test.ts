import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  canPlace,
  applyPlacement,
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

describe('applyPlacement()', () => {
  it('returns a different top-level board reference', () => {
    const before = createEmptyBoard();
    const after = applyPlacement(before, pieceById('single'), 0, 0);
    expect(after).not.toBe(before);
  });

  it('fills the single piece cell with its family', () => {
    const before = createEmptyBoard();
    const after = applyPlacement(before, pieceById('single'), 3, 3);
    expect(after[3]?.[3]).toBe('single');
  });

  it('fills exactly the cells of a square-2 with its family', () => {
    const before = createEmptyBoard();
    const after = applyPlacement(before, pieceById('square-2'), 4, 5);
    expect(after[4]?.[5]).toBe('sq2');
    expect(after[4]?.[6]).toBe('sq2');
    expect(after[5]?.[5]).toBe('sq2');
    expect(after[5]?.[6]).toBe('sq2');
  });

  it('only fills piece cells, not bbox holes (l3-ne)', () => {
    const before = createEmptyBoard();
    const after = applyPlacement(before, pieceById('l3-ne'), 0, 0);
    // Piece cells filled.
    expect(after[0]?.[0]).toBe('l3');
    expect(after[1]?.[0]).toBe('l3');
    expect(after[2]?.[0]).toBe('l3');
    expect(after[2]?.[1]).toBe('l3');
    expect(after[2]?.[2]).toBe('l3');
    // Bbox holes left null.
    expect(after[0]?.[1]).toBeNull();
    expect(after[0]?.[2]).toBeNull();
    expect(after[1]?.[1]).toBeNull();
    expect(after[1]?.[2]).toBeNull();
  });

  it('leaves cells outside the piece unchanged', () => {
    const before = withFilled([[9, 9, 'sq3']]);
    const after = applyPlacement(before, pieceById('single'), 0, 0);
    expect(after[9]?.[9]).toBe('sq3');
    expect(after[5]?.[5]).toBeNull();
  });

  it('does not mutate the input board on a successful placement', () => {
    const before = withFilled([[7, 7, 'line']]);
    const snapshot = JSON.parse(JSON.stringify(before));
    applyPlacement(before, pieceById('square-3'), 0, 0);
    expect(JSON.parse(JSON.stringify(before))).toEqual(snapshot);
  });

  it('throws when the placement is out of bounds', () => {
    const board = createEmptyBoard();
    expect(() => applyPlacement(board, pieceById('single'), 10, 0)).toThrow();
    expect(() => applyPlacement(board, pieceById('penta-h'), 0, 6)).toThrow();
  });

  it('throws when the placement overlaps an existing piece', () => {
    const board = withFilled([[3, 3, 'single']]);
    expect(() => applyPlacement(board, pieceById('square-2'), 3, 3)).toThrow();
  });

  it('throw message contains the piece id and anchor', () => {
    const board = createEmptyBoard();
    try {
      applyPlacement(board, pieceById('penta-h'), 0, 7);
      expect.fail('expected applyPlacement to throw');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).toMatch(/penta-h/);
      expect(msg).toMatch(/0/);
      expect(msg).toMatch(/7/);
    }
  });

  it('does not mutate the input board on a thrown placement', () => {
    const board = withFilled([[3, 3, 'single']]);
    const snapshot = JSON.parse(JSON.stringify(board));
    expect(() =>
      applyPlacement(board, pieceById('square-2'), 3, 3),
    ).toThrow();
    expect(JSON.parse(JSON.stringify(board))).toEqual(snapshot);
  });

  it('composes: two non-overlapping placements both land, no intermediate leakage', () => {
    const board0 = createEmptyBoard();
    const board1 = applyPlacement(board0, pieceById('square-2'), 0, 0);
    const board1Snapshot = JSON.parse(JSON.stringify(board1));
    const board2 = applyPlacement(board1, pieceById('square-2'), 5, 5);

    // First piece still present in board2.
    expect(board2[0]?.[0]).toBe('sq2');
    expect(board2[1]?.[1]).toBe('sq2');
    // Second piece present.
    expect(board2[5]?.[5]).toBe('sq2');
    expect(board2[6]?.[6]).toBe('sq2');
    // Intermediate board untouched by the second placement (full deep equality).
    expect(JSON.parse(JSON.stringify(board1))).toEqual(board1Snapshot);
  });
});
