import { BOARD_SIZE } from './engine';

export function createBoard(): HTMLElement {
  const board = document.createElement('div');
  board.className = 'board';

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const cell = document.createElement('div');
      cell.className = 'board__cell';
      cell.dataset['state'] = 'empty';
      cell.dataset['row'] = String(row);
      cell.dataset['col'] = String(col);
      board.appendChild(cell);
    }
  }

  return board;
}
