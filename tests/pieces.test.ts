import { describe, it, expect } from 'vitest';
import {
  CATALOG,
  findPieceById,
  type Piece,
  type PieceFamily,
} from '../src/pieces';

const expectedIds = [
  'single',
  'domino-h',
  'domino-v',
  'tromino-h',
  'tromino-v',
  'tetra-h',
  'tetra-v',
  'penta-h',
  'penta-v',
  'square-2',
  'square-3',
  'l2-ne',
  'l2-se',
  'l2-sw',
  'l2-nw',
  'l3-ne',
  'l3-se',
  'l3-sw',
  'l3-nw',
] as const;

const validFamilies: ReadonlyArray<PieceFamily> = [
  'single',
  'line',
  'sq2',
  'sq3',
  'l2',
  'l3',
];

function pieceById(id: string): Piece {
  const piece = CATALOG.find((p) => p.id === id);
  if (!piece) throw new Error(`piece "${id}" not found in CATALOG`);
  return piece;
}

function cellsAsSet(cells: ReadonlyArray<readonly [number, number]>): Set<string> {
  return new Set(cells.map(([r, c]) => `${r},${c}`));
}

describe('CATALOG', () => {
  it('contains exactly 19 pieces', () => {
    expect(CATALOG.length).toBe(19);
  });

  it('contains every expected piece id once', () => {
    const ids = CATALOG.map((p) => p.id).sort();
    expect(ids).toEqual([...expectedIds].sort());
  });

  it('has unique ids', () => {
    const ids = CATALOG.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses only the allowed family names', () => {
    for (const piece of CATALOG) {
      expect(validFamilies).toContain(piece.family);
    }
  });

  it('keeps every cell within its bounding box', () => {
    for (const piece of CATALOG) {
      expect(piece.cells.length).toBeGreaterThan(0);
      for (const [r, c] of piece.cells) {
        expect(r).toBeGreaterThanOrEqual(0);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(piece.bbox.h);
        expect(c).toBeLessThan(piece.bbox.w);
      }
    }
  });

  it('has no duplicate cells within a piece', () => {
    for (const piece of CATALOG) {
      const set = cellsAsSet(piece.cells);
      expect(set.size).toBe(piece.cells.length);
    }
  });
});

describe('CATALOG — family + size invariants', () => {
  const cases: Array<{ id: string; family: PieceFamily; cells: number; bbox: [number, number] }> = [
    { id: 'single',    family: 'single', cells: 1, bbox: [1, 1] },
    { id: 'domino-h',  family: 'line',   cells: 2, bbox: [2, 1] },
    { id: 'domino-v',  family: 'line',   cells: 2, bbox: [1, 2] },
    { id: 'tromino-h', family: 'line',   cells: 3, bbox: [3, 1] },
    { id: 'tromino-v', family: 'line',   cells: 3, bbox: [1, 3] },
    { id: 'tetra-h',   family: 'line',   cells: 4, bbox: [4, 1] },
    { id: 'tetra-v',   family: 'line',   cells: 4, bbox: [1, 4] },
    { id: 'penta-h',   family: 'line',   cells: 5, bbox: [5, 1] },
    { id: 'penta-v',   family: 'line',   cells: 5, bbox: [1, 5] },
    { id: 'square-2',  family: 'sq2',    cells: 4, bbox: [2, 2] },
    { id: 'square-3',  family: 'sq3',    cells: 9, bbox: [3, 3] },
    { id: 'l2-ne',     family: 'l2',     cells: 3, bbox: [2, 2] },
    { id: 'l2-se',     family: 'l2',     cells: 3, bbox: [2, 2] },
    { id: 'l2-sw',     family: 'l2',     cells: 3, bbox: [2, 2] },
    { id: 'l2-nw',     family: 'l2',     cells: 3, bbox: [2, 2] },
    { id: 'l3-ne',     family: 'l3',     cells: 5, bbox: [3, 3] },
    { id: 'l3-se',     family: 'l3',     cells: 5, bbox: [3, 3] },
    { id: 'l3-sw',     family: 'l3',     cells: 5, bbox: [3, 3] },
    { id: 'l3-nw',     family: 'l3',     cells: 5, bbox: [3, 3] },
  ];

  for (const { id, family, cells, bbox } of cases) {
    it(`${id} has family=${family}, ${cells} cells, bbox ${bbox[0]}x${bbox[1]}`, () => {
      const p = pieceById(id);
      expect(p.family).toBe(family);
      expect(p.cells.length).toBe(cells);
      expect(p.bbox.w).toBe(bbox[0]);
      expect(p.bbox.h).toBe(bbox[1]);
    });
  }
});

describe('findPieceById()', () => {
  it('returns the matching piece for a valid id', () => {
    const piece = findPieceById('single');
    expect(piece).toBeDefined();
    expect(piece?.id).toBe('single');
  });

  it('returns undefined for an unknown id', () => {
    expect(findPieceById('not-a-piece')).toBeUndefined();
  });
});

describe('CATALOG — L-shape cell fixtures', () => {
  const fixtures: Record<string, ReadonlyArray<readonly [number, number]>> = {
    'l2-ne': [[0, 0], [1, 0], [1, 1]],
    'l2-se': [[0, 0], [0, 1], [1, 0]],
    'l2-sw': [[0, 0], [0, 1], [1, 1]],
    'l2-nw': [[0, 1], [1, 0], [1, 1]],
    'l3-ne': [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
    'l3-se': [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]],
    'l3-sw': [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]],
    'l3-nw': [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]],
  };

  for (const [id, expected] of Object.entries(fixtures)) {
    it(`${id} matches the spec layout`, () => {
      const piece = pieceById(id);
      expect(cellsAsSet(piece.cells)).toEqual(cellsAsSet(expected));
    });
  }
});
