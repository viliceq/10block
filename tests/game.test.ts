import { describe, it, expect } from 'vitest';
import { createGame, TRAY_SIZE, type GameApi } from '../src/game';
import { CATALOG, samplePiece } from '../src/pieces';
import { canPlace } from '../src/engine';

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function trayIds(game: GameApi): Array<string | null> {
  return game.trayPieces.map((p) => p?.id ?? null);
}

function findSafeAnchor(game: GameApi, slotIndex: number): readonly [number, number] {
  const piece = game.trayPieces[slotIndex];
  if (!piece) throw new Error(`slot ${slotIndex} is empty`);
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (canPlace(game.boardState, piece, r, c)) return [r, c];
    }
  }
  throw new Error(`no legal anchor for piece in slot ${slotIndex}`);
}

/** Brute-force a deterministic seed whose first TRAY_SIZE sampled pieces match
 *  `predicate`. Replays `samplePiece` directly (no Game construction) so the
 *  search is fast. */
function findSeedWithPieces(
  predicate: (ids: ReadonlyArray<string>) => boolean,
  limit = 5000,
): number {
  for (let seed = 1; seed < limit; seed++) {
    const rng = mulberry32(seed);
    const ids: string[] = [];
    for (let i = 0; i < TRAY_SIZE; i++) ids.push(samplePiece(rng).id);
    if (predicate(ids)) return seed;
  }
  throw new Error(`no seed found within ${limit} tries`);
}

describe('createGame() — construction', () => {
  it('starts with an empty board', () => {
    const game = createGame({ rng: mulberry32(1) });
    for (const row of game.boardState) {
      for (const cell of row) {
        expect(cell).toBeNull();
      }
    }
  });

  it('provides TRAY_SIZE pieces from CATALOG in the tray', () => {
    const game = createGame({ rng: mulberry32(1) });
    expect(game.trayPieces.length).toBe(TRAY_SIZE);
    const ids = new Set(CATALOG.map((p) => p.id));
    for (const piece of game.trayPieces) {
      expect(piece).not.toBeNull();
      if (piece) expect(ids.has(piece.id)).toBe(true);
    }
  });

  it('is deterministic for a given rng seed', () => {
    const a = createGame({ rng: mulberry32(42) });
    const b = createGame({ rng: mulberry32(42) });
    expect(trayIds(a)).toEqual(trayIds(b));
  });
});

describe('mount()', () => {
  it('appends board then tray under the root', () => {
    const game = createGame({ rng: mulberry32(1) });
    const root = document.createElement('div');
    game.mount(root);
    const children = Array.from(root.children);
    const boardIdx = children.findIndex((c) => c.classList.contains('board'));
    const trayIdx = children.findIndex((c) => c.classList.contains('tray'));
    expect(boardIdx).toBeGreaterThanOrEqual(0);
    expect(trayIdx).toBeGreaterThan(boardIdx);
  });

  it('mounts pieces into the tray DOM that match trayPieces', () => {
    const game = createGame({ rng: mulberry32(1) });
    const root = document.createElement('div');
    game.mount(root);
    const slots = root.querySelectorAll<HTMLElement>('.tray__slot');
    for (let i = 0; i < TRAY_SIZE; i++) {
      const expected = game.trayPieces[i]?.id;
      expect(slots[i]?.dataset['pieceId']).toBe(expected);
    }
  });
});

describe('place() — happy path', () => {
  it('updates the board state with the placed piece', () => {
    const game = createGame({ rng: mulberry32(1) });
    game.mount(document.createElement('div'));
    const piece = game.trayPieces[0];
    if (!piece) throw new Error('expected a piece in slot 0');

    game.place(0, 0, 0);

    for (const [r, c] of piece.cells) {
      expect(game.boardState[r]?.[c]).toBe(piece.family);
    }
  });

  it('clears the slot DOM after a placement', () => {
    const game = createGame({ rng: mulberry32(1) });
    const root = document.createElement('div');
    game.mount(root);

    game.place(0, 0, 0);

    const slot0 = root.querySelectorAll<HTMLElement>('.tray__slot')[0];
    expect(slot0?.dataset['pieceId']).toBeUndefined();
    expect(slot0?.querySelectorAll('.tray__piece-cell').length).toBe(0);
  });

  it('reflects the placement on the board DOM', () => {
    const game = createGame({ rng: mulberry32(1) });
    const root = document.createElement('div');
    game.mount(root);
    const piece = game.trayPieces[0];
    if (!piece) throw new Error('expected a piece in slot 0');

    game.place(0, 0, 0);

    const firstCell = piece.cells[0];
    if (!firstCell) throw new Error('piece has no cells');
    const [r, c] = firstCell;
    const cellEl = root.querySelector<HTMLElement>(
      `.board__cell[data-row="${r}"][data-col="${c}"]`,
    );
    expect(cellEl?.dataset['state']).toBe('filled');
    expect(cellEl?.style.getPropertyValue('--piece-color')).toBe(
      `var(--color-piece-${piece.family})`,
    );
  });

  it('sets trayPieces[slotIndex] to null after placement', () => {
    const game = createGame({ rng: mulberry32(1) });
    game.mount(document.createElement('div'));
    game.place(0, 0, 0);
    expect(game.trayPieces[0]).toBeNull();
  });
});

describe('place() — rejections', () => {
  it('throws when slotIndex is out of range', () => {
    const game = createGame({ rng: mulberry32(1) });
    game.mount(document.createElement('div'));
    expect(() => game.place(-1, 0, 0)).toThrow();
    expect(() => game.place(TRAY_SIZE, 0, 0)).toThrow();
  });

  it('throws when the slot is already empty', () => {
    const game = createGame({ rng: mulberry32(1) });
    game.mount(document.createElement('div'));
    game.place(0, 0, 0);
    expect(() => game.place(0, 5, 5)).toThrow();
  });

  it('throws on illegal placement (out of bounds)', () => {
    const game = createGame({ rng: mulberry32(1) });
    game.mount(document.createElement('div'));
    expect(() => game.place(0, 10, 10)).toThrow();
  });
});

describe('place() — clears', () => {
  it('clears a completed row from boardState and DOM', () => {
    const seed = findSeedWithPieces(
      ([a, b]) => a === 'penta-h' && b === 'penta-h',
    );
    const game = createGame({ rng: mulberry32(seed) });
    const root = document.createElement('div');
    game.mount(root);

    game.place(0, 0, 0); // fills (0,0)..(0,4)
    game.place(1, 0, 5); // fills (0,5)..(0,9) — row 0 now full and cleared

    for (let c = 0; c < 10; c++) {
      expect(game.boardState[0]?.[c]).toBeNull();
    }

    const cells = root.querySelectorAll<HTMLElement>(
      '.board__cell[data-row="0"]',
    );
    expect(cells.length).toBe(10);
    for (const cell of cells) {
      expect(cell.dataset['state']).toBe('empty');
      expect(cell.style.getPropertyValue('--piece-color')).toBe('');
    }
  });

  it('does not clear when no row or column is complete', () => {
    const game = createGame({ rng: mulberry32(1) });
    game.mount(document.createElement('div'));
    const piece = game.trayPieces[0];
    if (!piece) throw new Error('no piece');

    game.place(0, 0, 0);

    for (const [r, c] of piece.cells) {
      expect(game.boardState[r]?.[c]).toBe(piece.family);
    }
  });

  it('respects refill timing after a clearing placement', () => {
    const seed = findSeedWithPieces(
      ([a, b]) => a === 'penta-h' && b === 'penta-h',
    );
    const game = createGame({ rng: mulberry32(seed) });
    game.mount(document.createElement('div'));

    const piece2Before = game.trayPieces[2];
    if (!piece2Before) throw new Error('no piece in slot 2');

    game.place(0, 0, 0);
    game.place(1, 0, 5); // clears row 0 — slot 2 still has its piece

    expect(game.trayPieces[0]).toBeNull();
    expect(game.trayPieces[1]).toBeNull();
    expect(game.trayPieces[2]?.id).toBe(piece2Before.id);
  });
});

describe('place() — illegal placements preserve state', () => {
  it('does not mutate board, tray, or DOM when placement throws', () => {
    const game = createGame({ rng: mulberry32(1) });
    const root = document.createElement('div');
    game.mount(root);

    const boardBefore = JSON.parse(JSON.stringify(game.boardState));
    const trayBefore = game.trayPieces.map((p) => p?.id ?? null);

    expect(() => game.place(0, 10, 10)).toThrow();

    expect(JSON.parse(JSON.stringify(game.boardState))).toEqual(boardBefore);
    expect(game.trayPieces.map((p) => p?.id ?? null)).toEqual(trayBefore);
    expect(
      root.querySelectorAll('.board__cell[data-state="filled"]').length,
    ).toBe(0);
  });
});

describe('place() — tray refill', () => {
  it('refills the tray after all three slots are placed', () => {
    const game = createGame({ rng: mulberry32(7) });
    const root = document.createElement('div');
    game.mount(root);

    for (let i = 0; i < TRAY_SIZE; i++) {
      const [r, c] = findSafeAnchor(game, i);
      game.place(i, r, c);
    }

    expect(game.trayPieces.length).toBe(TRAY_SIZE);
    const validIds = new Set(CATALOG.map((p) => p.id));
    for (const piece of game.trayPieces) {
      expect(piece).not.toBeNull();
      if (piece) expect(validIds.has(piece.id)).toBe(true);
    }

    const slots = root.querySelectorAll<HTMLElement>('.tray__slot');
    for (let i = 0; i < TRAY_SIZE; i++) {
      expect(slots[i]?.dataset['pieceId']).toBe(game.trayPieces[i]?.id);
    }
  });
});
