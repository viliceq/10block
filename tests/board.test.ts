import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createBoard, renderBoardState } from '../src/board';
import {
  createEmptyBoard,
  type BoardState,
  type CellState,
} from '../src/engine';
import { type PieceFamily } from '../src/pieces';

function withFilled(
  filled: ReadonlyArray<readonly [number, number, PieceFamily]>,
): BoardState {
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

function cellAt(boardEl: HTMLElement, row: number, col: number): HTMLElement {
  const cell = boardEl.querySelector<HTMLElement>(
    `.board__cell[data-row="${row}"][data-col="${col}"]`,
  );
  if (!cell) throw new Error(`cell (${row}, ${col}) not found`);
  return cell;
}

describe('createBoard()', () => {
  it('returns an HTMLElement with class "board"', () => {
    const el = createBoard();
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.classList.contains('board')).toBe(true);
  });

  it('contains exactly 100 cells with class "board__cell"', () => {
    const el = createBoard();
    const cells = el.querySelectorAll('.board__cell');
    expect(cells.length).toBe(100);
  });

  it('marks every cell as empty via data-state', () => {
    const el = createBoard();
    const cells = el.querySelectorAll<HTMLElement>('.board__cell');
    for (const cell of cells) {
      expect(cell.dataset['state']).toBe('empty');
    }
  });

  it('labels every corner cell with the expected data-row and data-col', () => {
    const el = createBoard();
    const corners: Array<[number, number]> = [
      [0, 0],
      [0, 9],
      [9, 0],
      [9, 9],
    ];
    for (const [row, col] of corners) {
      const cell = el.querySelector(
        `.board__cell[data-row="${row}"][data-col="${col}"]`,
      );
      expect(cell, `corner [${row},${col}] should exist`).not.toBeNull();
    }
  });

  it('labels a centre cell with the expected data-row and data-col', () => {
    const el = createBoard();
    const cell = el.querySelector('.board__cell[data-row="5"][data-col="5"]');
    expect(cell).not.toBeNull();
  });

  it('orders cells row-major from (0,0) to (9,9)', () => {
    const el = createBoard();
    const cells = el.querySelectorAll<HTMLElement>('.board__cell');
    const first = cells[0];
    const last = cells[cells.length - 1];
    expect(first?.dataset['row']).toBe('0');
    expect(first?.dataset['col']).toBe('0');
    expect(last?.dataset['row']).toBe('9');
    expect(last?.dataset['col']).toBe('9');
  });
});

describe('renderBoardState()', () => {
  it('leaves every cell empty when given an empty state', () => {
    const boardEl = createBoard();
    renderBoardState(boardEl, createEmptyBoard());
    const cells = boardEl.querySelectorAll<HTMLElement>('.board__cell');
    expect(cells.length).toBe(100);
    for (const cell of cells) {
      expect(cell.dataset['state']).toBe('empty');
      expect(cell.style.getPropertyValue('--piece-color')).toBe('');
    }
  });

  it('marks a single filled cell with its family colour', () => {
    const boardEl = createBoard();
    const state = withFilled([[3, 4, 'single']]);
    renderBoardState(boardEl, state);
    const target = cellAt(boardEl, 3, 4);
    expect(target.dataset['state']).toBe('filled');
    expect(target.style.getPropertyValue('--piece-color')).toBe(
      'var(--color-piece-single)',
    );
  });

  it('keeps all other cells empty when only one is filled', () => {
    const boardEl = createBoard();
    renderBoardState(boardEl, withFilled([[3, 4, 'single']]));
    const cells = boardEl.querySelectorAll<HTMLElement>('.board__cell');
    let filled = 0;
    for (const cell of cells) {
      if (cell.dataset['state'] === 'filled') filled++;
    }
    expect(filled).toBe(1);
  });

  it('applies the right family colour to each filled cell', () => {
    const boardEl = createBoard();
    const state = withFilled([
      [0, 0, 'sq2'],
      [9, 9, 'l3'],
      [5, 5, 'line'],
    ]);
    renderBoardState(boardEl, state);
    expect(cellAt(boardEl, 0, 0).style.getPropertyValue('--piece-color')).toBe(
      'var(--color-piece-sq2)',
    );
    expect(cellAt(boardEl, 9, 9).style.getPropertyValue('--piece-color')).toBe(
      'var(--color-piece-l3)',
    );
    expect(cellAt(boardEl, 5, 5).style.getPropertyValue('--piece-color')).toBe(
      'var(--color-piece-line)',
    );
  });

  it('clears a previously filled cell on re-render with empty state', () => {
    const boardEl = createBoard();
    renderBoardState(boardEl, withFilled([[2, 2, 'sq3']]));
    expect(cellAt(boardEl, 2, 2).dataset['state']).toBe('filled');

    renderBoardState(boardEl, createEmptyBoard());
    expect(cellAt(boardEl, 2, 2).dataset['state']).toBe('empty');
    expect(cellAt(boardEl, 2, 2).style.getPropertyValue('--piece-color')).toBe('');
  });

  it('fills a previously empty cell on re-render with filled state', () => {
    const boardEl = createBoard();
    renderBoardState(boardEl, createEmptyBoard());
    expect(cellAt(boardEl, 2, 2).dataset['state']).toBe('empty');

    renderBoardState(boardEl, withFilled([[2, 2, 'sq3']]));
    expect(cellAt(boardEl, 2, 2).dataset['state']).toBe('filled');
    expect(cellAt(boardEl, 2, 2).style.getPropertyValue('--piece-color')).toBe(
      'var(--color-piece-sq3)',
    );
  });

  it('locates cells by data-row/data-col, not DOM order', () => {
    const boardEl = createBoard();
    // Shuffle children so DOM order no longer matches (row * 10 + col).
    const shuffled = Array.from(boardEl.children).reverse();
    boardEl.replaceChildren(...shuffled);

    renderBoardState(boardEl, withFilled([[0, 0, 'single']]));
    expect(cellAt(boardEl, 0, 0).dataset['state']).toBe('filled');
    expect(cellAt(boardEl, 0, 0).style.getPropertyValue('--piece-color')).toBe(
      'var(--color-piece-single)',
    );
    expect(cellAt(boardEl, 9, 9).dataset['state']).toBe('empty');
  });

  it('does not mutate the input state', () => {
    const boardEl = createBoard();
    const state = withFilled([
      [1, 1, 'single'],
      [8, 8, 'sq2'],
    ]);
    const snapshot = JSON.parse(JSON.stringify(state));
    renderBoardState(boardEl, state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(snapshot);
  });
});

describe('board.css — placement animation', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  let css = '';

  beforeAll(() => {
    css = readFileSync(resolve(here, '../src/styles/board.css'), 'utf-8');
  });

  it('declares the cellAppear keyframes', () => {
    expect(css).toMatch(/@keyframes\s+cellAppear/);
  });

  it('animates opacity 0 → 1 and scale 0.85 → 1', () => {
    // Match keyframes containing both opacity transitions and the scale.
    expect(css).toMatch(/opacity:\s*0/);
    expect(css).toMatch(/scale\(0\.85\)/);
  });

  it('runs the animation on the filled state', () => {
    expect(css).toMatch(
      /\.board__cell\[data-state=['"]filled['"]\][^{]*\{[^}]*animation:[^;]*cellAppear/,
    );
  });
});
