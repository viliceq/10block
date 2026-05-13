import { describe, it, expect } from 'vitest';
import { createGame, TRAY_SIZE, type GameApi } from '../src/game';
import { CATALOG } from '../src/pieces';
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
