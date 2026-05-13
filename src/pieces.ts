export type PieceFamily = 'single' | 'line' | 'sq2' | 'sq3' | 'l2' | 'l3';

export type Piece = {
  readonly id: string;
  readonly family: PieceFamily;
  readonly cells: ReadonlyArray<readonly [number, number]>;
  readonly bbox: { readonly w: number; readonly h: number };
};

function line(id: string, length: number, orientation: 'h' | 'v'): Piece {
  const cells: Array<readonly [number, number]> = [];
  if (orientation === 'h') {
    for (let c = 0; c < length; c++) cells.push([0, c]);
  } else {
    for (let r = 0; r < length; r++) cells.push([r, 0]);
  }
  const bbox =
    orientation === 'h'
      ? ({ w: length, h: 1 } as const)
      : ({ w: 1, h: length } as const);
  return { id, family: 'line', cells, bbox };
}

function square(id: string, side: number, family: PieceFamily): Piece {
  const cells: Array<readonly [number, number]> = [];
  for (let r = 0; r < side; r++) {
    for (let c = 0; c < side; c++) cells.push([r, c]);
  }
  return { id, family, cells, bbox: { w: side, h: side } };
}

export const CATALOG: ReadonlyArray<Piece> = [
  { id: 'single', family: 'single', cells: [[0, 0]], bbox: { w: 1, h: 1 } },

  line('domino-h', 2, 'h'),
  line('domino-v', 2, 'v'),
  line('tromino-h', 3, 'h'),
  line('tromino-v', 3, 'v'),
  line('tetra-h', 4, 'h'),
  line('tetra-v', 4, 'v'),
  line('penta-h', 5, 'h'),
  line('penta-v', 5, 'v'),

  square('square-2', 2, 'sq2'),
  square('square-3', 3, 'sq3'),

  // L2 — suffix names the corner the L opens toward (missing bbox corner)
  { id: 'l2-ne', family: 'l2', cells: [[0, 0], [1, 0], [1, 1]], bbox: { w: 2, h: 2 } },
  { id: 'l2-se', family: 'l2', cells: [[0, 0], [0, 1], [1, 0]], bbox: { w: 2, h: 2 } },
  { id: 'l2-sw', family: 'l2', cells: [[0, 0], [0, 1], [1, 1]], bbox: { w: 2, h: 2 } },
  { id: 'l2-nw', family: 'l2', cells: [[0, 1], [1, 0], [1, 1]], bbox: { w: 2, h: 2 } },

  // L3 — suffix names the corner the L opens toward
  { id: 'l3-ne', family: 'l3', cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], bbox: { w: 3, h: 3 } },
  { id: 'l3-se', family: 'l3', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]], bbox: { w: 3, h: 3 } },
  { id: 'l3-sw', family: 'l3', cells: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], bbox: { w: 3, h: 3 } },
  { id: 'l3-nw', family: 'l3', cells: [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]], bbox: { w: 3, h: 3 } },
];

export function samplePiece(rng: () => number): Piece {
  const index = Math.floor(rng() * CATALOG.length);
  const piece = CATALOG[index];
  if (!piece) {
    throw new Error(`samplePiece: rng produced out-of-range index ${index}`);
  }
  return piece;
}
