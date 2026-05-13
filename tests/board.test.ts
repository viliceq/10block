import { describe, it, expect } from 'vitest';
import { createBoard } from '../src/board';

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
