import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { CELL_SIZE_FALLBACK } from '../src/drag';

const here = dirname(fileURLToPath(import.meta.url));
const tokensPath = resolve(here, '../src/styles/tokens.css');

let tokens = '';

beforeAll(() => {
  tokens = readFileSync(tokensPath, 'utf-8');
});

describe('tokens.css — Modern Dark palette', () => {
  it('declares the page background', () => {
    expect(tokens).toMatch(/--color-bg\s*:\s*#0F172A/i);
  });

  it('declares the board background', () => {
    expect(tokens).toMatch(/--color-board\s*:\s*#1E293B/i);
  });

  it('declares the empty-cell colour', () => {
    expect(tokens).toMatch(/--color-cell-empty\s*:\s*#334155/i);
  });

  it('declares the text colour', () => {
    expect(tokens).toMatch(/--color-text\s*:\s*#F1F5F9/i);
  });
});

describe('tokens.css — piece-family colours', () => {
  it('declares one colour per family', () => {
    expect(tokens).toMatch(/--color-piece-single\s*:\s*#38BDF8/i);
    expect(tokens).toMatch(/--color-piece-line\s*:\s*#4ADE80/i);
    expect(tokens).toMatch(/--color-piece-sq2\s*:\s*#F97316/i);
    expect(tokens).toMatch(/--color-piece-sq3\s*:\s*#A78BFA/i);
    expect(tokens).toMatch(/--color-piece-l2\s*:\s*#FACC15/i);
    expect(tokens).toMatch(/--color-piece-l3\s*:\s*#F472B6/i);
  });
});

describe('tokens.css — layout tokens', () => {
  it('declares the cell-size token', () => {
    expect(tokens).toMatch(/--cell-size\s*:/);
  });

  it('declares the cell-gap token', () => {
    expect(tokens).toMatch(/--cell-gap\s*:/);
  });

  it('declares the tray-cell-size token', () => {
    expect(tokens).toMatch(/--tray-cell-size\s*:/);
  });

  it('declares the radius token', () => {
    expect(tokens).toMatch(/--radius\s*:/);
  });

  it('keeps --tray-cell-size smaller than --cell-size', () => {
    const cell = tokens.match(/--cell-size\s*:\s*(\d+)px/i);
    const tray = tokens.match(/--tray-cell-size\s*:\s*(\d+)px/i);
    expect(cell).not.toBeNull();
    expect(tray).not.toBeNull();
    expect(Number(tray?.[1])).toBeLessThan(Number(cell?.[1]));
  });

  it('declares the z-ghost and ghost-opacity tokens', () => {
    expect(tokens).toMatch(/--z-ghost\s*:/);
    expect(tokens).toMatch(/--ghost-opacity\s*:/);
  });

  it('declares the z-overlay token', () => {
    expect(tokens).toMatch(/--z-overlay\s*:/);
  });

  it('declares --z-start-gate above --z-ghost', () => {
    const sg = tokens.match(/--z-start-gate\s*:\s*(\d+)/i);
    const gh = tokens.match(/--z-ghost\s*:\s*(\d+)/i);
    expect(sg).not.toBeNull();
    expect(gh).not.toBeNull();
    expect(Number(sg?.[1])).toBeGreaterThan(Number(gh?.[1]));
  });

  describe('JS-derived sizing, no width breakpoint (SPEC §8.3 / §8.9)', () => {
    it('has no max-width media query (sizing is aspect-driven, runtime)', () => {
      expect(tokens).not.toMatch(/@media\s*\(\s*max-width/i);
    });

    it('declares the static --min-cell and --tray-scale tokens', () => {
      expect(tokens).toMatch(/--min-cell\s*:\s*28px/i);
      expect(tokens).toMatch(/--tray-scale\s*:\s*0?\.5\b/i);
    });

    it('declares the canonical static spacing tokens', () => {
      expect(tokens).toMatch(/--cell-gap\s*:\s*2px/i);
      expect(tokens).toMatch(/--board-pad\s*:\s*6px/i);
      expect(tokens).toMatch(/--screen-pad\s*:\s*12px/i);
    });

    it('declares a --board-size first-paint fallback', () => {
      expect(tokens).toMatch(/--board-size\s*:/);
    });
  });

  it('keeps CELL_SIZE_FALLBACK in drag.ts in sync with --cell-size', () => {
    const match = tokens.match(/--cell-size\s*:\s*(\d+)px/i);
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBe(CELL_SIZE_FALLBACK);
  });
});
