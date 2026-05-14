import './styles/tokens.css';
import './styles/board.css';
import './styles/tray.css';
import './styles/drag.css';
import './styles/hud.css';
import './styles/overlay.css';
import { createGame } from './game';
import { createDrag } from './drag';

const app = document.getElementById('app');
if (app) {
  const game = createGame();
  game.mount(app);
  const trayEl = app.querySelector<HTMLElement>('.tray');
  const boardEl = app.querySelector<HTMLElement>('.board');
  if (trayEl && boardEl) {
    createDrag(game, trayEl, boardEl);
  }
}
